import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("user PDF library migration", () => {
  const sql = readFileSync("scripts/038_user_pdf_library.sql", "utf8")

  it("keeps activity user-scoped and records only supported events", () => {
    expect(sql).toContain("REFERENCES auth.users(id) ON DELETE CASCADE")
    expect(sql).toContain("PRIMARY KEY (user_id, pdf_id)")
    expect(sql).toContain("auth.uid() = user_id")
    expect(sql).toContain("p_event NOT IN ('view', 'download')")
    expect(sql).toContain("REVOKE ALL ON FUNCTION")
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION")
  })
})