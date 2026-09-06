import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("community submissions migration", () => {
  const sql = readFileSync("scripts/036_community_pdf_submissions.sql", "utf8")

  it("stores private paths and bounded pending metadata", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.community_submissions")
    expect(sql).not.toMatch(/\bfile_url\b/)
    expect(sql).toContain("file_size BETWEEN 1 AND 52428800")
    expect(sql).toContain("copyright_confirmed = true")
    expect(sql).toContain("status text NOT NULL DEFAULT 'pending'")
    expect(sql).toContain("storage_bucket text NOT NULL DEFAULT 'pdfs'")
    expect(sql).toContain("'community-pdfs'")
  })

  it("creates a private PDF-only community bucket and approval records it", () => {
    expect(sql).toContain("INSERT INTO storage.buckets")
    expect(sql).toContain("file_size_limit, allowed_mime_types")
    expect(sql).toContain("52428800")
    expect(sql).toContain("ARRAY['application/pdf']")
    expect(sql).toContain("'community-pdfs','clean',to_jsonb(v_row.review_warnings)")
  })

  it("keeps reservations and submissions private from clients", () => {
    expect(sql).toContain("FORCE ROW LEVEL SECURITY")
    expect(sql).toContain("FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()))")
    expect(sql).toContain("REVOKE ALL ON TABLE public.community_submission_reservations FROM PUBLIC, anon, authenticated")
    expect(sql).not.toMatch(/CREATE POLICY[\s\S]{0,100}FOR INSERT TO authenticated/)
  })

  it("serializes authoritative daily quota reservations without raw addresses", () => {
    expect(sql).toContain("pg_advisory_xact_lock")
    expect(sql).toContain("created_at >= v_since")
    expect(sql).toContain(">= 5")
    expect(sql).not.toMatch(/\b(raw_email|raw_ip|ip_address)\b/)
  })

  it("tracks cleanup without deleting quota history", () => {
    expect(sql).toContain("cleaned_at timestamptz")
    expect(sql).toContain("community_reservations_cleanup_idx")
    expect(sql).toContain("cleaned_at IS NULL")
  })

  it("binds and consumes reservations atomically", () => {
    expect(sql).toContain("WHERE id = p_reservation_id FOR UPDATE")
    expect(sql).toContain("v_res.email_hash <> p_email_hash")
    expect(sql).toContain("v_res.expected_path <> p_file_path")
    expect(sql).toContain("consumed_at=now(),consumed_path=p_file_path")
  })

  it("publishes only inside idempotent row-locked moderation", () => {
    expect(sql).toContain("WHERE id=p_submission_id FOR UPDATE")
    expect(sql).toContain("RETURN v_row")
    expect(sql).toContain("'public','published'")
    expect(sql).toContain("approved_pdf_id=v_pdf_id")
    expect(sql).toContain("to_jsonb(v_row.review_warnings)")
    expect(sql).toContain("conflicting moderation transition")
    expect(sql).toContain("v_row.malware_status <> 'clean'")
    expect(sql).toContain("submission safety review prevents approval")
    expect(sql).toContain("'community-pdfs','clean',to_jsonb(v_row.review_warnings)")
    expect(sql).toContain("DROP INDEX IF EXISTS public.pdfs_normalized_title_unique")
  })

  it("retains approval history if an approved PDF is later deleted", () => {
    expect(sql).toContain("approved_pdf_id uuid REFERENCES public.pdfs(id) ON DELETE SET NULL")
    expect(sql).toContain("status = 'approved' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND rejection_reason IS NULL")
    expect(sql).not.toContain("status = 'approved' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND approved_pdf_id IS NOT NULL")
  })

  it("allows only the service role to execute security definer RPCs", () => {
    expect(sql.match(/SECURITY DEFINER/g)?.length).toBe(5)
    expect(sql.match(/auth\.role\(\) <> 'service_role'/g)?.length).toBe(3)
    expect(sql.match(/REVOKE ALL ON FUNCTION/g)?.length).toBe(5)
    expect(sql.match(/TO service_role/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it("re-deploys public stats with the community safety predicate", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.get_public_pdf_stats()")
    expect(sql).toContain("storage_bucket <> 'community-pdfs' OR malware_status='clean'")
  })

  it("has a final migration that keeps queued community PDFs private", () => {
    const hardening = readFileSync("scripts/045_community_submission_hardening.sql", "utf8")
    expect(hardening).toContain("processing_status = 'completed'")
    expect(hardening).toContain("storage.objects")
    expect(hardening).toContain("reservation-bound storage object is missing")
    expect(hardening).toContain("duplicate content: an existing PDF already uses this content hash")
    expect(hardening).toContain("pg_advisory_xact_lock")
    expect(hardening).toContain("SET search_path = public, pg_temp")
  })

  it("makes finalization retry-safe and gates review inserts on completed community processing", () => {
    const hardening = readFileSync("scripts/045_community_submission_hardening.sql", "utf8")
    expect(hardening).toContain("CREATE OR REPLACE FUNCTION public.create_community_submission")
    expect(hardening).toContain("WHERE id=p_reservation_id FOR UPDATE")
    expect(hardening).toContain("v_res.consumed_at IS NOT NULL")
    expect(hardening).toContain("WHERE file_path=v_res.consumed_path")
    expect(hardening).toContain("IF FOUND THEN RETURN v_row")
    expect(hardening).toContain("invalid consumed reservation without matching submission")
    expect(hardening).toContain('DROP POLICY IF EXISTS "Authenticated users insert own reviews"')
    expect(hardening).toContain("ON public.reviews FOR INSERT TO authenticated")
    expect(hardening).toContain("pdfs.malware_status = 'clean'")
    expect(hardening).toContain("pdfs.processing_status = 'completed'")
  })

  it("uses claims to make expired private-upload cleanup race-free", () => {
    const cleanup = readFileSync("scripts/046_community_upload_cleanup_claims.sql", "utf8")
    expect(cleanup).toContain("ADD COLUMN IF NOT EXISTS cleanup_claim_token uuid")
    expect(cleanup).toContain("ADD COLUMN IF NOT EXISTS cleanup_claimed_at timestamptz")
    expect(cleanup).toContain("CREATE OR REPLACE FUNCTION public.claim_expired_community_uploads")
    expect(cleanup).toContain("FOR UPDATE SKIP LOCKED")
    expect(cleanup).toContain("interval '5 minutes'")
    expect(cleanup).toContain("gen_random_uuid()")
    expect(cleanup).toContain("CREATE OR REPLACE FUNCTION public.finish_community_upload_cleanup")
    expect(cleanup).toContain("cleanup_claim_token=p_claim_token")
    expect(cleanup).toContain("SET cleaned_at=now(),cleanup_claim_token=NULL")
    expect(cleanup).toContain("RETURN FOUND")
    expect(cleanup).toContain("reservation cleanup in progress")
    expect(cleanup).toContain("ERRCODE='55P03'")
    expect(cleanup.indexOf("IF v_res.consumed_at IS NOT NULL")).toBeLessThan(cleanup.indexOf("IF v_res.cleaned_at IS NOT NULL"))
    expect(cleanup).toContain("REVOKE ALL ON FUNCTION public.claim_expired_community_uploads")
    expect(cleanup).toContain("GRANT EXECUTE ON FUNCTION public.finish_community_upload_cleanup")
  })
})