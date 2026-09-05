import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const migration = readFileSync("scripts/042_least_privilege_grants.sql", "utf8")
const fullSetup = readFileSync("scripts/FULL_SETUP.sql", "utf8")

describe("least-privilege grants migration", () => {
  it("removes broad current and future client privileges", () => {
    expect(migration).toContain(
      "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated",
    )
    expect(migration).toContain(
      "REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated",
    )
    expect(migration).toContain(
      "REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated",
    )
    expect(migration).toMatch(
      /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public\s+REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated/,
    )
    expect(migration).toMatch(
      /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public\s+REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated/,
    )
    expect(migration).toMatch(
      /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public\s+REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated/,
    )
  })

  it("preserves service-role access to current and future objects", () => {
    for (const objectType of ["TABLES", "SEQUENCES"]) {
      expect(migration).toContain(
        `GRANT ALL PRIVILEGES ON ALL ${objectType} IN SCHEMA public TO service_role`,
      )
      expect(migration).toMatch(
        new RegExp(`ALTER DEFAULT PRIVILEGES[\\s\\S]*?GRANT ALL PRIVILEGES ON ${objectType} TO service_role`),
      )
    }
    expect(migration).toContain(
      "GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role",
    )
    expect(migration).toMatch(
      /ALTER DEFAULT PRIVILEGES[\s\S]*?GRANT EXECUTE ON FUNCTIONS TO service_role/,
    )
  })

  it("contains only the approved client table grants", () => {
    const grants = migration.match(/GRANT (?:SELECT|INSERT|UPDATE) ON TABLE[\s\S]*?;/g) ?? []
    expect(grants.join("\n")).toContain("public.categories")
    expect(grants.join("\n")).toContain("public.user_pdf_activity")
    expect(grants.join("\n")).toContain("GRANT INSERT ON TABLE public.reviews TO authenticated")
    expect(grants.join("\n")).toContain("GRANT UPDATE ON TABLE public.notifications TO authenticated")
    expect(grants.join("\n")).not.toContain("pdf_favorites")
    expect(grants.join("\n")).not.toContain("notification_preferences")
    expect(grants.join("\n")).not.toContain("site_settings")
    expect(grants.join("\n")).not.toContain("public.quizzes")
  })

  it("allows only the no-argument public stats RPC", () => {
    const clientFunctionGrants =
      migration.match(/GRANT EXECUTE ON FUNCTION .* TO (?:anon|authenticated|anon, authenticated).*;/g) ?? []
    expect(clientFunctionGrants).toEqual([
      "GRANT EXECUTE ON FUNCTION public.get_public_pdf_stats() TO anon, authenticated;",
    ])
  })

  it("keeps site settings server-only", () => {
    expect(migration).toContain(
      "REVOKE ALL PRIVILEGES ON TABLE public.site_settings FROM PUBLIC, anon, authenticated",
    )
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Allow public read on site_settings" ON public.site_settings',
    )
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Public site settings are readable" ON public.site_settings',
    )
    expect(migration).not.toContain("CREATE POLICY")
  })

  it("aligns the standalone fresh-install script", () => {
    expect(fullSetup).toContain(
      "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated",
    )
    expect(fullSetup).toContain(
      "REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated",
    )
    expect(fullSetup).toContain(
      "REVOKE ALL PRIVILEGES ON TABLE public.site_settings FROM PUBLIC, anon, authenticated",
    )
    expect(fullSetup).not.toContain('CREATE POLICY "Public site settings allow-list"')
    expect(fullSetup).not.toMatch(/GRANT .*pdf_favorites.* TO (?:anon|authenticated)/)
    expect(fullSetup).not.toMatch(/GRANT (?:SELECT|ALL).*public\.quizzes[\s\S]*?TO (?:anon|authenticated)/)
  })
})