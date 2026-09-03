import { afterEach, describe, expect, it } from "vitest"
import { createAdminToken } from "@/lib/admin-auth"
import {
  DELETE as deleteReview,
  POST as createReview,
} from "@/app/api/pdfs/[id]/reviews/route"
import { GET as listAdminReviews } from "@/app/api/reviews/route"

const originalPassword = process.env.ADMIN_PASSWORD
const validPdfId = "123e4567-e89b-42d3-a456-426614174000"
const context = { params: Promise.resolve({ id: validPdfId }) }

afterEach(() => {
  if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD
  else process.env.ADMIN_PASSWORD = originalPassword
})

describe("review route security and validation", () => {
  it("rejects malformed review JSON", async () => {
    const response = await createReview(new Request(`https://example.test/api/pdfs/${validPdfId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    }), context)
    expect(response.status).toBe(400)
  })

  it.each([
    [{ user_name: "Learner", rating: 4.5 }, "Rating"],
    [{ user_name: "Learner", rating: 6 }, "Rating"],
    [{ user_name: "Learner", rating: 5, comment: "x".repeat(2001) }, "Comment"],
  ])("rejects invalid review payload %#", async (payload, errorPrefix) => {
    const response = await createReview(new Request(`https://example.test/api/pdfs/${validPdfId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }), context)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(new RegExp(`^${errorPrefix}`))
  })

  it("rejects oversized review bodies before parsing or database access", async () => {
    const response = await createReview(new Request(`https://example.test/api/pdfs/${validPdfId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": "9000" },
      body: JSON.stringify({ user_name: "Learner", rating: 5 }),
    }), context)
    expect(response.status).toBe(413)
  })

  it("protects review administration endpoints", async () => {
    const listResponse = await listAdminReviews(new Request("https://example.test/api/reviews"))
    expect(listResponse.status).toBe(401)

    const deleteResponse = await deleteReview(new Request(
      `https://example.test/api/pdfs/${validPdfId}/reviews?reviewId=123e4567-e89b-42d3-a456-426614174001`,
      { method: "DELETE" },
    ), context)
    expect(deleteResponse.status).toBe(401)
  })

  it("rejects malformed IDs even for authenticated administrators", async () => {
    process.env.ADMIN_PASSWORD = "reviews-test-password"
    const token = createAdminToken("reviews-test-password")
    const response = await deleteReview(new Request(
      "https://example.test/api/pdfs/not-a-uuid/reviews?reviewId=also-not-a-uuid",
      { method: "DELETE", headers: { cookie: `admin_session=${token}` } },
    ), { params: Promise.resolve({ id: "not-a-uuid" }) })
    expect(response.status).toBe(400)
  })
})