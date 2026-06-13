import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../index";

describe("GET /health", () => {
  it("returns ok status", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      service: "sales-portal-api",
    });
  });
});
