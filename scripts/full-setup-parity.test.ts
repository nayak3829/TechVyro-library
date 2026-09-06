import { readFileSync, readdirSync } from "node:fs"
import { describe, expect, it } from "vitest"

const scriptsDirectory = "scripts"
const fullSetupPath = `${scriptsDirectory}/FULL_SETUP.sql`
const sql = readFileSync(fullSetupPath, "utf8")

const migrationFiles = readdirSync(scriptsDirectory)
  .filter((name) => /^\d{3}_.+\.sql$/.test(name))
  .sort((left, right) => {
    const leftNumber = Number(left.slice(0, 3))
    const rightNumber = Number(right.slice(0, 3))
    if (leftNumber !== rightNumber) return leftNumber - rightNumber
    if (left === "001_create_tables.sql") return -1
    if (right === "001_create_tables.sql") return 1
    return left.localeCompare(right)
  })

function declaredObjectNames(source: string) {
  const patterns = [
    /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([A-Za-z0-9_."]+)/gi,
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+([A-Za-z0-9_."]+)/gi,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+([A-Za-z0-9_."]+)/gi,
    /CREATE\s+TRIGGER\s+([A-Za-z0-9_."]+)/gi,
  ]

  return patterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) =>
      match[1].replaceAll('"', "").replace(/^public\./, ""),
    ),
  )
}

describe("FULL_SETUP fresh-project parity", () => {
  it("tracks every numbered SQL file once in dependency order", () => {
    expect(migrationFiles).toHaveLength(47)

    let previousEnd = -1
    for (const file of migrationFiles) {
      const beginMarker = `-- BEGIN ${file}`
      const endMarker = `-- END ${file}`
      expect(sql.split(beginMarker)).toHaveLength(2)
      expect(sql.split(endMarker)).toHaveLength(2)

      const begin = sql.indexOf(beginMarker)
      const end = sql.indexOf(endMarker)
      expect(begin, `${file} begins out of order`).toBeGreaterThan(previousEnd)
      expect(end, `${file} ends before it begins`).toBeGreaterThan(begin)
      previousEnd = end
    }
  })

  it("represents every table, index, function, and trigger declared by migrations", () => {
    for (const file of migrationFiles) {
      const source = readFileSync(`${scriptsDirectory}/${file}`, "utf8")
      for (const objectName of declaredObjectNames(source)) {
        expect(
          sql.includes(objectName),
          `${file} object ${objectName} is absent`,
        ).toBe(true)
      }
    }
  })

  it("contains the complete high-risk 028-045 integrity surfaces", () => {
    for (const required of [
      "CREATE EXTENSION IF NOT EXISTS pgcrypto",
      "get_public_pdf_stats",
      "storage_bucket <> 'community-pdfs' OR malware_status='clean'",
      "study_events_user_created_idx",
      "achievement_unlocks_user_unlocked_idx",
      "notifications_status_timestamps",
      "octet_length(payload::text)<=4096",
      "notification_preferences_opt_in_idx",
      "quiz_results_user_client_attempt_id_key",
      "provision_notification_preferences",
      "prior_result.quiz_id=v_result.quiz_id",
      "idx_pdfs_content_type",
      "idx_pdfs_subject",
      "community_reservations_cleanup_idx",
      "cardinality(review_warnings)<=20",
      "reserve_community_submission_slot",
      "create_community_submission",
      "find_pdfs_by_normalized_title",
      "increment_view_count.pdf_id",
      "increment_download_count.pdf_id",
      "idx_user_pdf_activity_recent",
      "idx_pdf_favorites_device_pdf_unique",
      "insert_quiz_result_and_award_progress",
      "get_admin_analytics_summary",
      "get_user_quiz_analytics",
      "status IN('completed','failed','dead')",
      "record_user_pdf_activity",
      "ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY",
      "ADD COLUMN IF NOT EXISTS question_count",
      "get_homepage_pdfs",
      "processing_status='completed'",
      "reservation-bound storage object is missing",
      "duplicate content: an existing PDF already uses this content hash",
    ]) {
      expect(sql.includes(required), `missing integrity surface: ${required}`).toBe(
        true,
      )
    }
  })

  it("preserves hardened review aggregation and bounded worker retries", () => {
    const reviewsStart = sql.indexOf("-- BEGIN 016_harden_reviews.sql")
    const reviewsEnd = sql.indexOf("-- END 016_harden_reviews.sql")
    const reviewsBlock = sql.slice(reviewsStart, reviewsEnd)

    expect(reviewsBlock).toContain(
      "CREATE OR REPLACE FUNCTION public.update_pdf_review_stats()",
    )
    expect(reviewsBlock).toContain("SECURITY DEFINER")
    expect(reviewsBlock).toContain("SET search_path=public,pg_temp")
    expect(reviewsBlock).toContain("UPDATE public.pdfs")
    expect(reviewsBlock).toContain("LEFT JOIN public.reviews")

    const retryStart = sql.indexOf("-- BEGIN 026_pdf_job_attempt_bounds.sql")
    const retryEnd = sql.indexOf("-- END 026_pdf_job_attempt_bounds.sql")
    const retryBlock = sql.slice(retryStart, retryEnd)
    expect(retryBlock).toContain("DROP CONSTRAINT IF EXISTS pdf_jobs_max_attempts_check")
    expect(retryBlock).toContain("ADD CONSTRAINT pdf_jobs_max_attempts_check")
    expect(retryBlock).toContain("CHECK(max_attempts BETWEEN 1 AND 20)")
  })

  it("is standalone and contains no delegated or placeholder setup", () => {
    expect(sql).not.toMatch(/^\s*\\(?:i|include)\b/im)
    expect(sql).not.toMatch(
      /\b(?:placeholder|implementation omitted|run (?:the )?separate migration|source of truth instead)\b/i,
    )
  })

  it("ends with final least-privilege, quiz, homepage, and community isolation", () => {
    const grants = sql.lastIndexOf("-- BEGIN 042_least_privilege_grants.sql")
    const quizIsolation = sql.lastIndexOf("-- BEGIN 043_quiz_answer_isolation.sql")
    const homepage = sql.lastIndexOf("-- BEGIN 044_homepage_pdf_payload.sql")
    const communityHardening = sql.lastIndexOf("-- BEGIN 045_community_submission_hardening.sql")
    expect(quizIsolation).toBeGreaterThan(grants)
    expect(homepage).toBeGreaterThan(quizIsolation)
    expect(communityHardening).toBeGreaterThan(homepage)

    const final = sql.slice(grants)
    expect(final).toContain(
      "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC,anon,authenticated",
    )
    expect(final).toContain(
      "REVOKE ALL PRIVILEGES ON public.quizzes FROM PUBLIC,anon,authenticated",
    )
    expect(final).toContain(
      "GRANT ALL PRIVILEGES ON public.quizzes TO service_role",
    )
    expect(final).toContain(
      "REVOKE ALL ON FUNCTION public.get_homepage_pdfs() FROM PUBLIC,anon,authenticated",
    )
    expect(final).toContain(
      "GRANT EXECUTE ON FUNCTION public.get_homepage_pdfs() TO service_role",
    )
  })

  it("contains final retry-safe submission finalization and review insert gating", () => {
    const start = sql.lastIndexOf("-- BEGIN 045_community_submission_hardening.sql")
    const end = sql.lastIndexOf("-- END 045_community_submission_hardening.sql")
    const finalHardening = sql.slice(start, end)
    expect(finalHardening).toContain("CREATE OR REPLACE FUNCTION public.create_community_submission")
    expect(finalHardening).toContain("WHERE id=p_reservation_id FOR UPDATE")
    expect(finalHardening).toContain("v_res.consumed_at IS NOT NULL")
    expect(finalHardening).toContain("IF FOUND THEN RETURN v_row")
    expect(finalHardening).toContain("invalid consumed reservation without matching submission")
    expect(finalHardening).toContain('DROP POLICY IF EXISTS "Authenticated users insert own reviews"')
    expect(finalHardening).toContain("ON public.reviews FOR INSERT TO authenticated")
    expect(finalHardening).toContain("pdfs.malware_status='clean'")
    expect(finalHardening).toContain("pdfs.processing_status='completed'")
  })

  it("includes the final race-free expired-upload cleanup protocol", () => {
    const start = sql.lastIndexOf("-- BEGIN 046_community_upload_cleanup_claims.sql")
    const end = sql.lastIndexOf("-- END 046_community_upload_cleanup_claims.sql")
    const cleanup = sql.slice(start, end)
    expect(cleanup).toContain("cleanup_claim_token uuid")
    expect(cleanup).toContain("FOR UPDATE SKIP LOCKED")
    expect(cleanup).toContain("cleanup_claim_token=p_claim_token")
    expect(cleanup).toContain("reservation cleanup in progress")
    expect(cleanup).toContain("claim_expired_community_uploads")
    expect(cleanup).toContain("TO service_role")
  })
})