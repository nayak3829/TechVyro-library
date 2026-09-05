import { expect, test, type Locator, type Page } from "@playwright/test"

const loginStates = [
  { name: "login", path: "/login", primary: /Login to TechVyro/i },
  { name: "sign-up", path: "/login?mode=signup", primary: /Create Free Account/i },
  { name: "forgot-password", path: "/login?mode=forgot", primary: /Send Reset Link/i },
] as const

async function expectNoHorizontalOverflow(page: Page, root: Locator) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth,
      })),
    )
    .toEqual({ document: 0, body: 0 })

  const box = await root.boundingBox()
  const viewport = page.viewportSize()
  expect(box).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width)
}

async function expectKeyboardReachable(page: Page, control: Locator) {
  await control.scrollIntoViewIfNeeded()
  await expect(control).toBeVisible()
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })

  for (let attempts = 0; attempts < 30; attempts += 1) {
    await page.keyboard.press("Tab")
    if (await control.evaluate((element) => element === document.activeElement)) return
  }

  throw new Error(`Primary control was not keyboard-reachable: ${await control.innerText()}`)
}

test.beforeEach(async ({ page }) => {
  page.on("request", (request) => {
    const isAuthMutation =
      request.method() !== "GET" &&
      (/\/auth\/v1\//.test(request.url()) || /accounts\.google\.com/.test(request.url()))
    if (isAuthMutation) {
      throw new Error(`Auth layout test attempted an external mutation: ${request.method()} ${request.url()}`)
    }
  })
})

for (const state of loginStates) {
  test(`${state.name} page fits and keeps its primary action accessible`, async ({ page }) => {
    await page.goto(state.path)
    const card = page.locator(".auth-card")
    const primary = page.getByRole("button", { name: state.primary })

    await expect(card).toBeVisible()
    await expectNoHorizontalOverflow(page, card)
    await expectKeyboardReachable(page, primary)
  })
}

test("invalid reset link fits and exposes its recovery action", async ({ page }) => {
  await page.goto("/reset-password")
  const card = page.locator(".auth-card")
  const primary = page.getByRole("button", { name: /Request a new reset link/i })

  await expect(page.getByText(/invalid or has expired/i)).toBeVisible()
  await expectNoHorizontalOverflow(page, card)
  await expectKeyboardReachable(page, primary)
})

test("protected test play redirects to an accessible login page", async ({ page }) => {
  await page.goto(
    "/test-series/play?testId=layout-check&apiBase=remote:test&title=Layout%20Check&duration=60",
  )
  await expect(page).toHaveURL(/\/login\?redirect=/)
  const card = page.locator(".auth-card")
  const primary = page.getByRole("button", { name: /Login to TechVyro/i })
  await expect(card).toBeVisible()
  await expectNoHorizontalOverflow(page, card)
  await expectKeyboardReachable(page, primary)
})