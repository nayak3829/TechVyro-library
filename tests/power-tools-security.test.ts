import { afterEach, describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { createAdminToken } from "@/lib/admin-auth"
import { escapeCsvCell } from "@/lib/csv-export"
import { PATCH as updateVisibility, POST as runBatchAI } from "@/app/api/pdfs/batch-ai/route"
import { POST as syncApx } from "@/app/api/apx/sync/route"

const originalPassword = process.env.ADMIN_PASSWORD

afterEach(() => {
  if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD
  else process.env.ADMIN_PASSWORD = originalPassword
})

function adminCookie() {
  process.env.ADMIN_PASSWORD = "power-tools-test-password"
  return `admin_session=${createAdminToken("power-tools-test-password")}`
}

describe("Power Tools security and validation", () => {
  it.each(["=1+1", "+cmd", "-10+20", "@SUM(A1:A2)"])(
    "neutralizes spreadsheet formula cells: %s",
    (value) => expect(escapeCsvCell(value)).toBe(`"'${value}"`),
  )

  it("escapes quotes and wraps every CSV cell", () => {
    expect(escapeCsvCell('Study "Guide"')).toBe('"Study ""Guide"""')
  })

  it("rejects malformed and unsupported AI batch modes", async () => {
    const cookie = adminCookie()
    const malformed = await runBatchAI(new Request("https://example.test/api/pdfs/batch-ai", {
      method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: "{",
    }))
    expect(malformed.status).toBe(400)

    const unsupported = await runBatchAI(new Request("https://example.test/api/pdfs/batch-ai", {
      method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ mode: "delete" }),
    }))
    expect(unsupported.status).toBe(400)
  })

  it("rejects invalid visibility and oversized ID batches", async () => {
    const cookie = adminCookie()
    const invalidVisibility = await updateVisibility(new Request("https://example.test/api/pdfs/batch-ai", {
      method: "PATCH", headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ["123e4567-e89b-42d3-a456-426614174000"], visibility: "everyone" }),
    }))
    expect(invalidVisibility.status).toBe(400)

    const tooMany = await updateVisibility(new Request("https://example.test/api/pdfs/batch-ai", {
      method: "PATCH", headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: Array.from({ length: 101 }, () => "123e4567-e89b-42d3-a456-426614174000"),
        visibility: "public",
      }),
    }))
    expect(tooMany.status).toBe(400)
  })

  it("rejects invalid APX sync limits before external or database work", async () => {
    const response = await syncApx(new NextRequest("https://example.test/api/apx/sync", {
      method: "POST",
      headers: { cookie: adminCookie(), "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 1000 }),
    }))
    expect(response.status).toBe(400)
  })
})