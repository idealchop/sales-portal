import { expect, test } from "@playwright/test";

test.describe("Login page", () => {
  test("renders sign-in form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });
});
