import { expect, test } from "@playwright/test";
import { API_PATH } from "./bdd-api";
import { fetchEmulatorIdToken, TEST_ADMIN_USER } from "./test-users";

test.describe("salesPortalApi admin users bulk delete", () => {
  test("POST /admin/users/bulk-delete returns 400 for empty uids", async ({
    request,
  }) => {
    const idToken = await fetchEmulatorIdToken(TEST_ADMIN_USER.email);

    const res = await request.post(`${API_PATH}/admin/users/bulk-delete`, {
      headers: {
        "Authorization": `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      data: { uids: [] },
    });

    expect(res.status()).toBe(400);
  });

  test("POST /admin/users/bulk-delete returns 401 without token", async ({
    request,
  }) => {
    const res = await request.post(`${API_PATH}/admin/users/bulk-delete`, {
      headers: { "Content-Type": "application/json" },
      data: { uids: ["some-uid"] },
    });

    expect(res.status()).toBe(401);
  });
});
