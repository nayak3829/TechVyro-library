import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("notification preference provisioning migration", () => {
  it("backfills accounts and protects the auth insert trigger function", () => {
    const sql = readFileSync(resolve(process.cwd(), "scripts/032_notification_delivery_defaults.sql"), "utf8")
    expect(sql).toContain("SELECT id FROM auth.users")
    expect(sql).toContain("ON CONFLICT (user_id) DO NOTHING")
    expect(sql).toContain("SECURITY DEFINER")
    expect(sql).toContain("SET search_path = pg_catalog")
    expect(sql).toContain("AFTER INSERT ON auth.users")
    expect(sql).toContain("REVOKE ALL ON FUNCTION")
  })
})