import { defineConfig, devices } from "@playwright/test"

const layoutViewports = [
  { name: "phone", width: 360, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
]
const productionServer = process.env.PLAYWRIGHT_PRODUCTION === "1"

export default defineConfig({
  testDir: ".",
  testMatch: ["e2e/**/*.spec.ts", "tests/e2e/**/*.spec.ts"],
  fullyParallel: true,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: productionServer ? "pnpm run start" : "pnpm run dev",
        url: "http://127.0.0.1:5000",
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