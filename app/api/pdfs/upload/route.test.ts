import { describe, expect, it } from "vitest"

import { POST } from "./route"

describe("legacy PDF upload", () => {
  it("is retired for every caller so only smart upload can create PDFs", async () => {
    const response = await POST(new Request("https://example.test/api/pdfs/upload", { method: "POST" }))
    expect(response.status).toBe(410)
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/smart upload pipeline/i) })
  })
})