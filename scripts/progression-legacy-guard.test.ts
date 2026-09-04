import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const sql = readFileSync("scripts/034_progression_legacy_guard.sql", "utf8")

describe("legacy progression migration", () => {
  it("canonicalizes old result events and keeps a legacy-aware award guard", () => {
    expect(sql).toContain("se.event_key LIKE 'quiz-result:%'")
    expect(sql).toContain("'quiz:' || qr.quiz_id AS canonical_key")
    expect(sql).toContain("JOIN public.quiz_results prior_result")
    expect(sql).toContain("prior_result.quiz_id = v_result.quiz_id")
    expect(sql).toContain("ON CONFLICT (user_id, event_key) DO NOTHING")
  })
})