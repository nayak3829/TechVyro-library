import { expect, test } from "@playwright/test"
import { PDFDocument } from "pdf-lib"

const adminPassword = process.env.ADMIN_PASSWORD

test.beforeEach(async ({ context }) => {
  test.skip(!adminPassword, "ADMIN_PASSWORD is required for authenticated admin browser tests")
  await context.clearCookies()
})

test.use({ trace: "off" })

async function login(page: import("@playwright/test").Page) {
  await page.addInitScript(() => sessionStorage.setItem("wa_popup_shown", "1"))
  await page.goto("/admin")
  await expect(page.getByText("Admin Access", { exact: true })).toBeVisible({ timeout: 30_000 })
  await page.getByLabel("Password").fill(adminPassword!)
  await page.getByRole("button", { name: "Login" }).click()
  await expect(page.getByText("Admin Panel", { exact: true })).toBeVisible({ timeout: 30_000 })
}

test("admin login, deep-link navigation, refresh, and logout work", async ({ page }) => {
  test.setTimeout(120_000)
  await login(page)

  await page.getByRole("button", { name: /PDF Manager/ }).click()
  await expect(page).toHaveURL(/#pdfs$/)
  await expect(page.getByRole("heading", { name: "PDF Manager" })).toBeVisible()

  await page.getByRole("tab", { name: /All PDFs/ }).click()
  await expect(page).toHaveURL(/#pdfs\/library$/)
  await page.reload()
  await expect(page.getByRole("tab", { name: /All PDFs/ })).toHaveAttribute("aria-selected", "true")

  await page.getByRole("button", { name: "Logout" }).click()
  await expect(page.getByText("Admin Access", { exact: true })).toBeVisible({ timeout: 30_000 })
})

test("admin API accepts only its same-origin HttpOnly session cookie", async ({ page, context }) => {
  await login(page)

  const sessionCookie = (await context.cookies()).find(cookie => cookie.name === "admin_session")
  expect(sessionCookie).toBeDefined()
  expect(sessionCookie?.httpOnly).toBe(true)
  expect(await page.evaluate(() => sessionStorage.getItem("admin_token"))).toBeNull()

  const cookieVerification = await page.request.post("/api/admin/verify")
  expect(await cookieVerification.json()).toEqual({ valid: true })

  await context.clearCookies()
  const bearerVerification = await page.request.post("/api/admin/verify", {
    headers: { Authorization: `Bearer ${sessionCookie!.value}` },
  })
  expect(await bearerVerification.json()).toEqual({ valid: false })
  const bodyVerification = await page.request.post("/api/admin/verify", {
    data: { token: sessionCookie!.value },
  })
  expect(await bodyVerification.json()).toEqual({ valid: false })

  await context.addCookies([sessionCookie!])
  const crossOriginVerification = await page.request.post("/api/admin/verify", {
    headers: { Origin: "https://attacker.invalid", "Sec-Fetch-Site": "cross-site" },
  })
  expect(await crossOriginVerification.json()).toEqual({ valid: false })

  await context.clearCookies()
  await context.addCookies([{ ...sessionCookie!, value: "invalid" }])
  const logoutResponse = await page.request.post("/api/admin/logout")
  expect(logoutResponse.status()).toBe(200)
  expect(await logoutResponse.json()).toEqual({ success: true })
  expect((await context.cookies()).find(cookie => cookie.name === "admin_session")).toBeUndefined()
})

test("authenticated overview hydrates without runtime errors", async ({ page }) => {
  test.setTimeout(120_000)
  const runtimeErrors: string[] = []
  page.on("pageerror", error => runtimeErrors.push(error.message))
  page.on("console", message => {
    if (message.type() === "error") runtimeErrors.push(message.text())
  })

  await login(page)
  await page.goto("/admin#overview")
  await expect(page.getByRole("heading", { name: /Admin$/ })).toBeVisible()
  await page.waitForTimeout(1_000)

  expect(runtimeErrors.filter(message =>
    message.includes("Hydration failed") ||
    message.includes("Invalid hook call")
  )).toEqual([])
})

test("Power Tools loads through the HttpOnly admin session", async ({ page }) => {
  await login(page)
  const healthResponse = page.waitForResponse(response =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname === "/api/pdfs/batch-ai",
  )

  await page.getByRole("button", { name: "Power Tools", exact: true }).click()

  await expect(page.getByRole("heading", { name: "Power Tools" })).toBeVisible()
  expect((await healthResponse).status()).toBe(200)
})

test("admin dashboard navigation fits and works on a narrow phone", async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 360, height: 800 })
  await login(page)

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)

  const menuButton = page.getByRole("button", { name: "Open navigation menu" })
  await expect(menuButton).toHaveAttribute("aria-expanded", "false")
  await menuButton.click()
  await expect(menuButton).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByRole("button", { name: "Reviews", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Close navigation menu" }).last().click()
  await expect(menuButton).toHaveAttribute("aria-expanded", "false")
})

test("admin can cancel PDF analysis without losing the queued file", async ({ page }) => {
  test.setTimeout(120_000)
  await login(page)
  await page.getByRole("button", { name: /PDF Manager/ }).click()

  const document = await PDFDocument.create()
  for (let pageNumber = 0; pageNumber < 30; pageNumber += 1) document.addPage()
  const bytes = await document.save()

  await page.locator('input[type="file"][multiple]').setInputFiles({
    name: "Cancel Test.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(bytes),
  })

  const cancelButton = page.getByRole("button", { name: "Cancel processing Cancel Test" })
  await expect(cancelButton).toBeVisible({ timeout: 30_000 })
  await cancelButton.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByText("Analysis cancelled — ready to resume")).toBeVisible()
  await expect(page.locator('input[value="Cancel Test"]')).toBeVisible()
})