import { expect, test } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "node:crypto"

test("restores a signed-in account after refresh and returns to Login after cookies are removed", async ({ page, context }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  expect(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is required for the auth browser test").toBeTruthy()
  expect(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY is required for the auth browser test").toBeTruthy()

  const admin = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const suffix = randomUUID()
  const email = `browser-refresh-${suffix}@example.com`
  const password = `E2e!${suffix}`
  let userId: string | undefined

  try {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Browser Refresh" },
    })
    expect(error, "temporary confirmed test user should be created").toBeNull()
    userId = data.user?.id
    expect(userId).toBeTruthy()

    await page.goto("/login")
    await page.waitForLoadState("networkidle")
    await page.getByPlaceholder("your@email.com").fill(email)
    await page.getByPlaceholder("Enter your password").fill(password)
    const loginButton = page.getByRole("button", { name: "Login to TechVyro" })
    await expect(loginButton).toBeEnabled()
    await loginButton.click()

    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 })
    await expect(page.getByRole("button", { name: /Browser/ })).toBeVisible()

    const authCookies = (await context.cookies()).filter((cookie) =>
      cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"),
    )
    expect(authCookies.length, "Supabase SSR auth cookies should be present").toBeGreaterThan(0)

    await page.reload()
    await expect(page.getByRole("button", { name: /Browser/ })).toBeVisible()
    await expect(page.getByRole("link", { name: "Login" })).toHaveCount(0)

    await context.clearCookies()
    await page.reload()
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible()
  } finally {
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId)
      expect(error, "temporary test user should be deleted").toBeNull()
    }
  }
})