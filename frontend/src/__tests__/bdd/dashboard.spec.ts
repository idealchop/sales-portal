import { expect, test } from "@playwright/test";

test.describe("Dashboard", () => {
  test("redirects unauthenticated visitors to login", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});
