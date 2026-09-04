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
})