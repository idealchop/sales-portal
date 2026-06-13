import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/__tests__/bdd",
  testMatch: "**/*.spec.ts",
  workers: 1,
  use: {
    baseURL:
      "http://127.0.0.1:5001/aquaflow-management-suite/asia-southeast1/salesPortalApi",
    extraHTTPHeaders: {
      Accept: "application/json",
    },
    trace: "retain-on-failure",
  },
});
