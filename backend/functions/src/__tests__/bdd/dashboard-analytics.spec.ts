import { expect, test } from "@playwright/test";
import { API_PATH } from "./bdd-api";
import { fetchEmulatorIdToken, TEST_ADMIN_USER } from "./test-users";

test.describe("salesPortalApi dashboard analytics", () => {
  test("GET /dashboard/analytics returns growth metrics for admin", async ({
    request,
  }) => {
    const idToken = await fetchEmulatorIdToken(TEST_ADMIN_USER.email);

    const res = await request.get(`${API_PATH}/dashboard/analytics`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toBeTruthy();
    expect(body.data.growthSalesMetrics).toBeTruthy();
    expect(Array.isArray(body.data.growthSalesMetrics.growth)).toBe(true);
    expect(body.data.aiSalesInsights).toBeTruthy();
    expect(typeof body.data.aiSalesInsights.aiEnabled).toBe("boolean");
    expect(body.data.newJoiners).toBeTruthy();
    expect(Array.isArray(body.data.newJoiners.salesReps)).toBe(true);
    expect(Array.isArray(body.data.newJoiners.businesses)).toBe(true);
    expect(Array.isArray(body.data.newJoiners.platformUsers)).toBe(true);
  });

  test("GET /dashboard/analytics returns 401 without token", async ({
    request,
  }) => {
    const res = await request.get(`${API_PATH}/dashboard/analytics`);
    expect(res.status()).toBe(401);
  });
});
