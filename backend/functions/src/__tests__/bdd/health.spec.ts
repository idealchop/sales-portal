import { expect, test } from "@playwright/test";
import { API_PATH } from "./bdd-api";

test.describe("salesPortalApi health", () => {
  test("GET /health returns ok", async ({ request }) => {
    const res = await request.get(`${API_PATH}/health`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      status: "ok",
      service: "sales-portal-api",
    });
  });
});
