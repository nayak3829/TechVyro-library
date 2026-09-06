import { describe, expect, it, vi } from "vitest"
import { cleanupExpiredCommunityUploads } from "./community-upload-cleanup"

function createDb(options?: { removeError?: boolean }) {
  const finished: Array<Record<string, unknown>> = []
  const removed: string[] = []
  const expired = [
    { reservation_id: "one", expected_path: "community/one.pdf", claim_token: "claim-one" },
    { reservation_id: "two", expected_path: "community/two.pdf", claim_token: "claim-two" },
  ]

  const db = {
    async rpc(name: string, args: Record<string, unknown>) {
      if (name === "claim_expired_community_uploads") {
        expect(args).toEqual({ p_limit: 20 })
        return { data: expired, error: null }
      }
      if (name === "finish_community_upload_cleanup") {
        finished.push(args)
        return { data: true, error: null }
      }
      throw new Error(`Unexpected RPC ${name}`)
    },
    storage: {
      from(bucket: string) {
        expect(bucket).toBe("community-pdfs")
        return {
          remove: vi.fn(async ([path]: string[]) => {
            removed.push(path)
            return { error: options?.removeError && path.includes("one") ? new Error("failed") : null }
          }),
        }
      },
    },
  }
  return { db, finished, removed }
}

describe("expired community upload cleanup", () => {
  it("removes expired objects and marks their reservations without deleting quota history", async () => {
    const { db, finished, removed } = createDb()

    await expect(cleanupExpiredCommunityUploads(db as never, 20))
      .resolves.toEqual({ cleaned: 2, failed: 0 })
    expect(removed).toEqual(["community/one.pdf", "community/two.pdf"])
    expect(finished).toEqual([
      { p_reservation_id: "one", p_claim_token: "claim-one", p_removed: true },
      { p_reservation_id: "two", p_claim_token: "claim-two", p_removed: true },
    ])
  })

  it("releases a claim without marking cleanup complete when storage removal fails", async () => {
    const { db, finished } = createDb({ removeError: true })

    await expect(cleanupExpiredCommunityUploads(db as never, 20))
      .resolves.toEqual({ cleaned: 1, failed: 1 })
    expect(finished[0]).toEqual({
      p_reservation_id: "one",
      p_claim_token: "claim-one",
      p_removed: false,
    })
  })
})