import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page, context }) => {
  await context.clearCookies()
  await page.addInitScript(() => sessionStorage.setItem("wa_popup_shown", "1"))
})

test("homepage primary actions and chatbot remain usable", async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto("/")

  await expect(page.getByRole("heading", { name: /Welcome to TechVyro/i })).toBeVisible()

  await page.getByRole("main").getByRole("link", { name: "Browse PDFs", exact: true }).click()
  await expect(page).toHaveURL(/#content$/)

  await page.getByRole("button", { name: "Open TechVyro AI Assistant" }).click()
  await expect(page.getByRole("dialog", { name: "TechVyro AI" })).toBeVisible()
  await page.getByRole("button", { name: "Minimize chat" }).click()
  await expect(page.getByRole("button", { name: "Expand chat" })).toBeVisible()
  await page.getByRole("dialog", { name: "TechVyro AI" }).getByRole("button", { name: "Close chat" }).click()
  await expect(page.getByRole("dialog", { name: "TechVyro AI" })).toHaveCount(0)
})

test("homepage fits a narrow phone without horizontal overflow", async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto("/")

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)

  await expect(page.getByRole("link", { name: "Privacy" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Terms" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Open search" })).toBeVisible()
})

test("homepage has one main landmark and never invents student reviews", async ({ page }) => {
  await page.route("**/api/site-settings?key=testimonials", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ value: [{ id: 7, name: null }, { id: "bad", name: "Ignored", course: "SSC", comment: "", enabled: true, rating: 5 }] }),
  }))
  await page.goto("/")
  await expect(page.getByRole("main")).toHaveCount(1)
  await expect(page.getByText("Rahul Sharma")).toHaveCount(0)
  await expect(page.getByText("Words from students")).toHaveCount(0)
})

test("homepage section links open Browse with the selected section filter", async ({ page }) => {
  await page.route("**/api/pdfs", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        pdfs: [
          {
            id: "matching",
            title: "Selected Section Notes",
            description: "Should be visible",
            file_path: "/selected.pdf",
            file_size: 1024,
            view_count: 0,
            allow_download: true,
            created_at: "2026-01-01",
            structure_location: { folderId: "folder-1", categoryId: "category-1", sectionId: "section-1" },
            category: null,
          },
          {
            id: "other",
            title: "Other Section Notes",
            description: "Should be filtered out",
            file_path: "/other.pdf",
            file_size: 1024,
            view_count: 0,
            allow_download: true,
            created_at: "2026-01-01",
            structure_location: { folderId: "folder-1", categoryId: "category-1", sectionId: "section-2" },
            category: null,
          },
        ],
      }),
    })
  })
  await page.route("**/api/quizzes", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        quizzes: [
          {
            id: "matching-quiz",
            title: "Selected Section Quiz",
            description: "Should be visible",
            category: "Science",
            section: "Physics",
            difficulty: "medium",
            time_limit: 600,
            question_count: 1,
            hasContent: true,
            created_at: "2026-01-01T00:00:00.000Z",
            tags: [],
            enabled: true,
            visibility: "public",
            structure_location: { folderId: "folder-1", categoryId: "category-1", sectionId: "section-1" },
          },
          {
            id: "other-quiz",
            title: "Other Section Quiz",
            description: "Should be filtered out",
            category: "Science",
            section: "Chemistry",
            difficulty: "medium",
            time_limit: 600,
            question_count: 1,
            hasContent: true,
            created_at: "2026-01-01T00:00:00.000Z",
            tags: [],
            enabled: true,
            visibility: "public",
            structure_location: { folderId: "folder-1", categoryId: "category-1", sectionId: "section-2" },
          },
        ],
      }),
    })
  })
  await page.route("**/api/content-structure", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ folders: [] }) })
  })

  await page.goto("/browse?folderId=folder-1&categoryId=category-1&sectionId=section-1")
  await expect(page.getByText("Selected Section Notes")).toBeVisible()
  await expect(page.getByText("Other Section Notes")).toHaveCount(0)
  await expect(page.getByText("Selected Section Quiz")).toBeVisible()
  await expect(page.getByText("Other Section Quiz")).toHaveCount(0)
})

test("Browse distinguishes service failure from an empty catalogue", async ({ page }) => {
  for (const endpoint of ["**/api/pdfs", "**/api/quizzes", "**/api/content-structure"]) {
    await page.route(endpoint, route => route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Temporarily unavailable" }),
    }))
  }

  await page.goto("/browse")

  await expect(page.getByRole("heading", { name: "Catalogue unavailable" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Try Again" })).toBeVisible()
  await expect(page.getByText("No content found")).toHaveCount(0)
  await expect(page.locator("#browse-tabpanel[role='tabpanel']")).toHaveCount(1)
})