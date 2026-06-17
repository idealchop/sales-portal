import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const { verifyIdTokenMock, validateAccessMock } = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  validateAccessMock: vi.fn(),
}));

vi.mock("../../config/firebase-admin", () => ({
  auth: {
    verifyIdToken: verifyIdTokenMock,
    getUser: vi.fn(),
  },
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(async () => ({ exists: false, data: () => undefined })),
      })),
    })),
  },
  FieldValue: { serverTimestamp: vi.fn() },
  storage: {},
}));

vi.mock("../../services/sales-portal-access", () => ({
  validateSalesPortalAccess: validateAccessMock,
  SALES_PORTAL_APP_ID: "sales-portal",
}));

vi.mock("../../services/auth/session-activity-service", () => ({
  scheduleApiSessionAccessRecord: vi.fn(),
  writeUserLoginEvent: vi.fn(),
}));

import { app } from "../../index";

describe("auth middleware integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /auth/status", () => {
    it("returns 401 without Authorization header", async () => {
      const res = await request(app).get("/auth/status");

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: "Unauthorized" });
    });

    it("returns 401 when token verification fails", async () => {
      verifyIdTokenMock.mockRejectedValueOnce(new Error("invalid token"));

      const res = await request(app)
        .get("/auth/status")
        .set("Authorization", "Bearer invalid");

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: "Unauthorized" });
    });

    it("returns 403 when user lacks sales portal access", async () => {
      verifyIdTokenMock.mockResolvedValueOnce({
        uid: "user-no-access",
        email: "noaccess@example.com",
      });
      validateAccessMock.mockResolvedValueOnce({
        allowed: false,
        reason: "You do not have access to the Sales Portal.",
        code: "NO_SALES_PORTAL_ACCESS",
      });

      const res = await request(app)
        .get("/auth/status")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({
        code: "NO_SALES_PORTAL_ACCESS",
      });
    });
  });

  describe("GET /dashboard/analytics", () => {
    it("returns 401 without token", async () => {
      const res = await request(app).get("/dashboard/analytics");

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: "Unauthorized" });
    });
  });

  describe("GET /admin/users", () => {
    it("returns 401 without token", async () => {
      const res = await request(app).get("/admin/users");

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: "Unauthorized" });
    });

    it("returns 403 for authenticated sales user", async () => {
      verifyIdTokenMock.mockResolvedValueOnce({
        uid: "sales-user",
        email: "sales@example.com",
      });
      validateAccessMock.mockResolvedValueOnce({
        allowed: true,
        role: "sales",
        roleAssigned: true,
        onboardingComplete: true,
        requiresPasswordChange: false,
        userProfile: {},
      });

      const res = await request(app)
        .get("/admin/users")
        .set("Authorization", "Bearer sales-token");

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ error: "Admin access required." });
    });
  });
});
