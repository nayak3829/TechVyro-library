import { describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  from: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: state.from }),
}))

import { publishInAppNotification } from "./notifications"

describe("in-app notification publisher", () => {
  it("rejects unsafe content before accessing the service client", async () => {
    await expect(publishInAppNotification({
      kind: "pdf", entityId: "pdf-1", title: "PDF", href: "https://private.example/file",
    })).rejects.toThrow("Invalid notification content")
    expect(state.from).not.toHaveBeenCalled()
  })

  it("fans out only to opted-in users with a deterministic dedupe key", async () => {
    state.upsert.mockResolvedValue({ error: null })
    state.from.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        const query: any = { select: () => query, eq: () => Promise.resolve({ data: [{ user_id: "user-a" }], error: null }) }
        return query
      }
      return { upsert: state.upsert }
    })

    await publishInAppNotification({
      kind: "quiz", entityId: "practice-1", title: "New quiz", href: "/quiz/practice-1",
      payload: { quizId: "practice-1" },
    })

    expect(state.upsert).toHaveBeenCalledWith([expect.objectContaining({
      user_id: "user-a", event_key: "quiz:published:practice-1",
    })], expect.objectContaining({ onConflict: "user_id,event_key", ignoreDuplicates: true }))
  })
})