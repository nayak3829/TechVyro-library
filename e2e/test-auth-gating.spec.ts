import { expect, test } from "@playwright/test"

test("anonymous users cannot open quiz or test play routes directly", async ({ page }) => {
  await page.goto("/quiz/example-quiz")
  await expect(page).toHaveURL(/\/login\?redirect=%2Fquiz%2Fexample-quiz$/)

  await page.goto("/test-series/play?testId=sample-1&apiBase=sample:ssc")
  await expect(page).toHaveURL(
    /\/login\?redirect=%2Ftest-series%2Fplay%3FtestId%3Dsample-1%26apiBase%3Dsample%253Assc$/,
  )
})

test("anonymous users cannot fetch protected quiz content or submit results", async ({ request }) => {
  const responses = await Promise.all([
    request.get("/api/quizzes/example-quiz"),
    request.get("/api/extract/questions?testId=sample-1&apiBase=sample:ssc"),
    request.get("/api/quiz-html?testId=sample-1&apiBase=sample:ssc"),
    request.post("/api/quiz-results", { data: {} }),
  ])

  expect(responses.map((response) => response.status())).toEqual([401, 401, 401, 401])
})

test("public browsing and leaderboard remain available without login", async ({ request }) => {
  const [quizList, testCatalog, leaderboard] = await Promise.all([
    request.get("/api/quizzes"),
    request.get("/test-series"),
    request.get("/quiz/leaderboard"),
  ])

  expect(quizList.ok()).toBe(true)
  expect(testCatalog.ok()).toBe(true)
  expect(leaderboard.ok()).toBe(true)
})