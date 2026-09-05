import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const migration = readFileSync("scripts/041_authorization_isolation.sql", "utf8")

describe("Phase 5 authorization isolation migration", () => {
  it("limits direct PDF and review access to safe public publications", () => {
    for (const predicate of [
      "visibility = 'public'",
      "publish_status = 'published'",
      "malware_status = 'clean'",
      "scheduled_at IS NULL OR scheduled_at <= NOW()",
    ]) {
      expect(migration).toContain(predicate)
    }
    expect(migration).not.toContain("visibility IN ('public', 'unlisted')")
  })

  it("removes direct quiz access from database clients", () => {
    expect(migration).toContain("REVOKE ALL PRIVILEGES ON TABLE public.quizzes FROM PUBLIC, anon, authenticated")
    expect(migration).not.toMatch(/CREATE POLICY[^;]+ON public\.quizzes/i)
  })

  it("removes every legacy policy and grant from obsolete client tables", () => {
    expect(migration).toContain("tablename = 'user_credits'")
    expect(migration).toContain("tablename = 'pdf_favorites'")
    expect(migration).toContain("DROP POLICY IF EXISTS %I ON public.user_credits")
    expect(migration).toContain("DROP POLICY IF EXISTS %I ON public.pdf_favorites")
    expect(migration).toContain("REVOKE ALL PRIVILEGES ON TABLE public.user_credits FROM anon, authenticated")
    expect(migration).toContain("REVOKE ALL PRIVILEGES ON TABLE public.pdf_favorites FROM anon, authenticated")
  })

  it("defends the activity RPC internally as well as through grants", () => {
    expect(migration).toContain("auth.role() IS DISTINCT FROM 'service_role'")
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.record_user_pdf_activity(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated",
    )
  })
})