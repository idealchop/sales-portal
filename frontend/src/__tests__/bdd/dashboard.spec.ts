import { expect, test } from "@playwright/test";

const DASHBOARD_ROUTES = [
  "/dashboard",
  "/dashboard/smartrefill",
  "/dashboard/sales-portal",
];

test.describe("Dashboard", () => {
  for (const route of DASHBOARD_ROUTES) {
    test(`${route} redirects unauthenticated visitors to login`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    });
  }
});
