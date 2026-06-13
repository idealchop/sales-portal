import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = process.env.PLAYWRIGHT_PORT ?? "9002";
const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  testDir: "./src/__tests__/bdd",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
    actionTimeout: 20_000,
  },
  expect: {
    timeout: 20_000,
  },
  projects: [
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? {}
    : {
        webServer: {
          command: `npm run dev -- -p ${E2E_PORT}`,
          url: E2E_BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      }),
});
