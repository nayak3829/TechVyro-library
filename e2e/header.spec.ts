import { expect, test } from "@playwright/test"

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
})

test("desktop header controls navigate, search, browse, and change theme", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("wa_popup_shown", "1"))
  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")

  await expect(page.getByRole("link", { name: "Login" })).toBeVisible()

  const browse = page.getByRole("button", { name: "Browse" })
  await expect(browse).toHaveAttribute("aria-expanded", "false")
  await browse.click()
  await expect(browse).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByRole("link", { name: /Browse by Subject/ })).toBeVisible()

  const themeToggle = page.getByRole("button", { name: "Toggle theme" })
  await expect(themeToggle).toBeEnabled()
  const initialTheme = await page.locator("html").getAttribute("class")
  await themeToggle.click()
  await expect.poll(() => page.locator("html").getAttribute("class")).not.toBe(initialTheme)

  const search = page.locator("header").getByPlaceholder(/Search PDFs, notes, subjects/)
  await search.fill("Physics")
  await search.press("Enter")
  await expect(page).toHaveURL(/q=Physics/)
  expect(new URL(page.url()).hash).toBe("#content")
})

test("mobile header stays within the viewport and exposes search", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => sessionStorage.setItem("wa_popup_shown", "1"))
  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)

  await expect(page.getByRole("link", { name: "Login" })).toBeVisible()
  const openSearch = page.getByRole("button", { name: "Open search" })
  await expect(openSearch).toHaveAttribute("aria-expanded", "false")
  await openSearch.click()
  await expect(page.getByRole("button", { name: "Close search" })).toHaveAttribute("aria-expanded", "true")

  const mobileSearch = page.locator("#mobile-header-search").getByRole("searchbox")
  await expect(mobileSearch).toBeVisible()
  await mobileSearch.fill("Chemistry")
  await mobileSearch.press("Enter")
  await expect(page).toHaveURL(/q=Chemistry/)
  expect(new URL(page.url()).hash).toBe("#content")
})

test("WhatsApp popup does not block header navigation", async ({ page }) => {
  await page.route("**/api/site-settings?key=general_settings", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ value: { whatsappPopupEnabled: true } }),
    })
  })
  await page.goto("/")
  await expect(page.getByRole("button", { name: "Close" })).toBeVisible({ timeout: 10_000 })

  await page.getByRole("link", { name: "About", exact: true }).click()
  await expect(page).toHaveURL(/\/about$/)
})

test("primary desktop navigation links open the correct routes", async ({ page }) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => sessionStorage.setItem("wa_popup_shown", "1"))
  await page.goto("/")

  const destinations = [
    { name: "Quiz Portal", route: "/quiz" },
    { name: "Mock Tests", route: "/test-series" },
    { name: "About", route: "/about" },
  ]

  for (const destination of destinations) {
    await page.getByRole("link", { name: destination.name, exact: true }).first().click()
    await expect(page).toHaveURL(new RegExp(`${destination.route}$`))
    await page.goto("/")
  }
})