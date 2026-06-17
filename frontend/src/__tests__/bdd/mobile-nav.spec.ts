import { expect, test } from "@playwright/test";

test.describe("Mobile navigation", () => {
  test("dashboard redirect works on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});
