import { defineConfig, devices } from "@playwright/test"

const layoutViewports = [
  { name: "phone", width: 360, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
]
const productionServer = process.env.PLAYWRIGHT_PRODUCTION === "1"
const localBaseUrl = "http://localhost:5000"

export default defineConfig({
  timeout: 90_000,
  testDir: ".",
  testMatch: ["e2e/**/*.spec.ts", "tests/e2e/**/*.spec.ts"],
  fullyParallel: true,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  use: {
    // Chromium persists Secure cookies on localhost in production-mode tests.
    // Keep browser and APIRequestContext on this one canonical hostname.
    baseURL: process.env.PLAYWRIGHT_BASE_URL || localBaseUrl,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: productionServer ? "pnpm run start" : "pnpm run dev",
        url: localBaseUrl,
        reuseExistingServer: !productionServer,
        timeout: 120_000,
      },
  projects: [
    {
      name: "auth-refresh",
      testMatch: /\/e2e\/auth-refresh\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "test-auth-gating",
      testMatch: /\/e2e\/test-auth-gating\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "header",
      testMatch: /\/e2e\/header\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "homepage",
      testMatch: /\/e2e\/homepage\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "admin",
      testMatch: /\/e2e\/admin\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    ...layoutViewports.map(({ name, width, height }) => ({
      name: `layout-${name}`,
      testMatch: /\/tests\/e2e\/.*\.spec\.ts$/,
      use: { viewport: { width, height } },
    })),
  ],
})