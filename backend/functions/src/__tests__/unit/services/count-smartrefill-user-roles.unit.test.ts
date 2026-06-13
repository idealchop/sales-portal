import { describe, expect, it } from "vitest";
import {
  activeUserAveragePerRole,
  countActiveUsersByRole,
  countSmartRefillUserRoles,
  resolveSmartRefillUserRole,
} from "../../../services/count-smartrefill-user-roles";

describe("countSmartRefillUserRoles", () => {
  const ownerIds = new Set(["owner-1", "owner-2"]);

  it("counts owners, admins, and riders from appAccess", () => {
    const counts = countSmartRefillUserRoles(
      [
        {
          id: "owner-1",
          data: {
            appAccess: [{ appId: "smartrefill", role: "owner", businessId: "biz-1" }],
          },
        },
        {
          id: "admin-1",
          data: {
            appAccess: [{ appId: "smartrefill", role: "admin", businessId: "biz-1" }],
          },
        },
        {
          id: "rider-1",
          data: {
            appAccess: [{ appId: "smartrefill", role: "rider", businessId: "biz-1" }],
          },
        },
        {
          id: "legacy-staff",
          data: {
            appAccess: [{ appId: "smartrefill", role: "staff", businessId: "biz-1" }],
          },
        },
      ],
      ownerIds,
    );

    expect(counts).toEqual({
      owners: 1,
      admins: 1,
      riders: 2,
      unassigned: 0,
    });
  });

  it("falls back to business owner when role is missing", () => {
    expect(
      resolveSmartRefillUserRole(
        "owner-2",
        { appAccess: [{ appId: "smartrefill", businessId: "biz-2" }] },
        ownerIds,
      ),
    ).toBe("owner");
  });

  it("counts active users by role", () => {
    const active = countActiveUsersByRole(
      new Set(["owner-1", "admin-1", "rider-1"]),
      [
        {
          id: "owner-1",
          data: { appAccess: [{ appId: "smartrefill", role: "owner" }] },
        },
        {
          id: "admin-1",
          data: { appAccess: [{ appId: "smartrefill", role: "admin" }] },
        },
        {
          id: "rider-1",
          data: { appAccess: [{ appId: "smartrefill", role: "rider" }] },
        },
      ],
      new Set(["owner-1"]),
    );

    expect(active).toEqual({ owners: 1, admins: 1, riders: 1 });
    expect(activeUserAveragePerRole(active)).toBe("1.0");
  });
});
