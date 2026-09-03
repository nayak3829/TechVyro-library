import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { isValidAnalyticsEventKey } from "@/lib/analytics-events"

describe("real analytics migration", () => {
  const sql = readFileSync("scripts/018_real_analytics.sql", "utf8")

  it("uses append-only events and atomic counter updates", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS analytics_events")
    expect(sql).toContain("view_count = COALESCE(view_count, 0) + 1")
    expect(sql).toContain("download_count = COALESCE(download_count, 0) + 1")
    expect(sql).toContain("ON CONFLICT (event_key)")
  })

  it("keeps analytics data private and service-role functions constrained", () => {
    expect(sql).toContain("ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY")
    expect(sql).toContain("REVOKE ALL ON FUNCTION increment_view_count")
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION get_analytics_trends(INTEGER) TO service_role")
    expect(sql).toContain("SET search_path = public, pg_temp")
  })

  it("requires event keys to be scoped to their event type and PDF", () => {
    expect(isValidAnalyticsEventKey("view:pdf-1:event-1", "view", "pdf-1")).toBe(true)
    expect(isValidAnalyticsEventKey("view:pdf-2:event-1", "view", "pdf-1")).toBe(false)
    expect(isValidAnalyticsEventKey("download:pdf-1:event-1", "view", "pdf-1")).toBe(false)
    expect(isValidAnalyticsEventKey(null, "view", "pdf-1")).toBe(true)
  })
})