import { createAdminClient } from "@/lib/supabase/admin"

const MAX_CLEANUP_BATCH = 50

/**
 * Remove bounded, expired community uploads without deleting reservation rows,
 * which remain part of daily quota accounting.
 */
export async function cleanupExpiredCommunityUploads(
  db: ReturnType<typeof createAdminClient> = createAdminClient(),
  limit = 20,
) {
  const batchSize = Math.min(Math.max(Math.floor(limit), 1), MAX_CLEANUP_BATCH)
  const { data: expired, error } = await db.rpc("claim_expired_community_uploads", {
    p_limit: batchSize,
  })

  if (error) return { cleaned: 0, failed: 0 }

  let cleaned = 0
  let failed = 0
  for (const reservation of expired || []) {
    const removal = await db.storage.from("community-pdfs").remove([reservation.expected_path])
    const finished = await db.rpc("finish_community_upload_cleanup", {
      p_reservation_id: reservation.reservation_id,
      p_claim_token: reservation.claim_token,
      p_removed: !removal.error,
    })
    if (removal.error || finished.error || finished.data !== true) {
      failed++
      continue
    }
    cleaned++
  }

  return { cleaned, failed }
}