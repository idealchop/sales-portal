import { expect, test } from "@playwright/test";
import { API_PATH } from "./bdd-api";
import { fetchEmulatorIdToken, TEST_SALES_USER } from "./test-users";

test.describe("salesPortalApi auth", () => {
  test("GET /auth/status returns role for seeded sales user", async ({
    request,
  }) => {
    const idToken = await fetchEmulatorIdToken(TEST_SALES_USER.email);

    const res = await request.get(`${API_PATH}/auth/status`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({
      uid: TEST_SALES_USER.uid,
      role: "sales",
      onboardingComplete: true,
    });
  });

  test("GET /auth/status returns 401 without token", async ({ request }) => {
    const res = await request.get(`${API_PATH}/auth/status`);
    expect(res.status()).toBe(401);
  });
});
