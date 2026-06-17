import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const { verifyIdTokenMock, validateAccessMock, deleteAdminUsersMock } =
  vi.hoisted(() => ({
    verifyIdTokenMock: vi.fn(),
    validateAccessMock: vi.fn(),
    deleteAdminUsersMock: vi.fn(),
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

vi.mock("../../services/admin-user-service", () => ({
  deleteAdminUsers: deleteAdminUsersMock,
  listAdminUsers: vi.fn(async () => []),
  createAdminUser: vi.fn(),
  updateAdminUserAppAccess: vi.fn(),
  deleteAdminUser: vi.fn(),
  listUserFirestoreDocuments: vi.fn(),
  upsertUserFirestoreDocument: vi.fn(),
  deleteUserFirestoreDocument: vi.fn(),
  deleteUserFirestoreProfile: vi.fn(),
  ADMIN_KNOWN_APPS: [],
}));

import { app } from "../../index";

describe("admin users bulk delete integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdTokenMock.mockResolvedValue({ uid: "admin-actor" });
    validateAccessMock.mockResolvedValue({
      allowed: true,
      role: "admin",
      uid: "admin-actor",
    });
  });

  it("returns 400 when uids array is empty", async () => {
    const res = await request(app)
      .post("/admin/users/bulk-delete")
      .set("Authorization", "Bearer valid-token")
      .send({ uids: [] });

    expect(res.status).toBe(400);
    expect(deleteAdminUsersMock).not.toHaveBeenCalled();
  });

  it("delegates to deleteAdminUsers for valid payload", async () => {
    deleteAdminUsersMock.mockResolvedValue({
      deleted: [{ uid: "u1", deletedAuth: true, deletedProfile: true }],
      failed: [],
    });

    const res = await request(app)
      .post("/admin/users/bulk-delete")
      .set("Authorization", "Bearer valid-token")
      .send({ uids: ["u1", "u2"] });

    expect(res.status).toBe(200);
    expect(deleteAdminUsersMock).toHaveBeenCalledWith(["u1", "u2"], "admin-actor");
    expect(res.body.data.deleted).toHaveLength(1);
  });
});
