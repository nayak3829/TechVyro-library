import { readdirSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("API data-integrity migrations", () => {
  it("removes every quiz policy and all direct client privileges", () => {
    const migration = readFileSync("scripts/043_quiz_answer_isolation.sql", "utf8")

    expect(migration).toContain("tablename = 'quizzes'")
    expect(migration).toContain("DROP POLICY IF EXISTS %I ON public.quizzes")
    expect(migration).toContain(
      "REVOKE ALL PRIVILEGES ON TABLE public.quizzes FROM PUBLIC, anon, authenticated",
    )
    expect(migration).not.toContain("CREATE POLICY")
  })

  it("never grants client quiz access in fresh or incremental setup sources", () => {
    const paths = readdirSync("scripts")
      .filter(name => name.endsWith(".sql"))
      .map(name => `scripts/${name}`)
    for (const path of paths) {
      const source = readFileSync(path, "utf8")
      const clientGrants = (source.match(/GRANT (?:SELECT|ALL PRIVILEGES) ON TABLE[^;]+;/gi) ?? [])
        .filter(statement => /\bTO\s+(?:PUBLIC|anon|authenticated)/i.test(statement))
      expect(source).not.toMatch(/CREATE POLICY[^;]+ON (?:public\.)?quizzes/i)
      expect(clientGrants.join("\n")).not.toContain("public.quizzes")
    }

    for (const path of [
      "scripts/004_create_quiz_tables.sql",
      "scripts/015_harden_quiz_rls.sql",
      "scripts/041_authorization_isolation.sql",
      "scripts/042_least_privilege_grants.sql",
      "scripts/FULL_SETUP.sql",
    ]) {
      expect(readFileSync(path, "utf8")).toContain(
        "REVOKE ALL PRIVILEGES ON TABLE public.quizzes FROM PUBLIC, anon, authenticated",
      )
    }
  })

  it("removes direct client access to PDF favorites", () => {
    const migration = readFileSync("scripts/040_lock_down_pdf_favorites.sql", "utf8")

    expect(migration).toContain('DROP POLICY IF EXISTS "Allow all on pdf_favorites"')
    expect(migration).toContain("REVOKE ALL PRIVILEGES ON TABLE public.pdf_favorites FROM anon, authenticated")
    expect(migration).not.toContain("USING (true)")
  })

  it("keeps fresh installs from recreating the permissive favorites policy", () => {
    for (const path of ["scripts/007_add_user_id_to_tables.sql", "scripts/FULL_SETUP.sql"]) {
      const source = readFileSync(path, "utf8")
      expect(source).toContain("REVOKE ALL PRIVILEGES ON TABLE pdf_favorites FROM anon, authenticated")
      expect(source).not.toContain('CREATE POLICY "Allow all on pdf_favorites"')
    }
  })
})