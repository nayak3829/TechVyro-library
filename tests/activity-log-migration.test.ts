import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("activity log migration", () => {
  const sql = readFileSync("scripts/020_real_activity_log.sql", "utf8")

  it("creates an append-only private audit table with stable indexes", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS audit_events")
    expect(sql).toContain("ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY")
    expect(sql).toContain("REVOKE ALL ON TABLE audit_events FROM PUBLIC, anon, authenticated")
    expect(sql).toContain("idx_audit_events_id_desc")
  })

  it("captures successful writes without storing row values", () => {
    expect(sql).toContain("AFTER INSERT OR UPDATE OR DELETE")
    expect(sql).toContain("jsonb_build_object('changed_fields', changed_fields)")
    expect(sql).not.toContain("jsonb_build_object('old'")
    expect(sql).not.toContain("jsonb_build_object('new'")
  })

  it("enforces retention and constrains privileged functions", () => {
    expect(sql).toContain("MAKE_INTERVAL(days =>")
    expect(sql).toContain("'purge-expired-audit-events'")
    expect(sql).toContain("GRANT SELECT, INSERT ON TABLE audit_events TO service_role")
    expect(sql).not.toContain("GRANT SELECT, INSERT, DELETE ON TABLE audit_events")
    expect(sql).toContain("SET search_path = public, pg_temp")
    expect(sql).toContain("REVOKE ALL ON FUNCTION capture_audit_event()")
  })
})