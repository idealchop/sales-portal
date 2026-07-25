import { describe, expect, it } from "vitest";
import { resolvePlatformAlertDataManagementPath } from "@/features/dashboard/lib/platform-alert-data-management";
import type { PlatformAlert } from "@/lib/dashboard/analytics";

function alert(overrides: Partial<PlatformAlert> & Pick<PlatformAlert, "id">): PlatformAlert {
  return {
    kind: "subscription_change",
    title: "Station",
    subtitle: "Updated",
    occurredAt: "2026-07-23T00:00:00.000Z",
    ...overrides,
  };
}

describe("resolvePlatformAlertDataManagementPath", () => {
  it("opens business info when businessId is present", () => {
    const href = resolvePlatformAlertDataManagementPath(
      alert({
        id: "sub-1",
        businessId: "biz-1",
        userId: "user-1",
      }),
      "/dashboard/smartrefill",
    );

    expect(href).toBe(
      "/admin/data-management/business/biz-1?returnTo=%2Fdashboard%2Fsmartrefill&userId=user-1",
    );
  });

  it("searches data management by email when no businessId", () => {
    const href = resolvePlatformAlertDataManagementPath(
      alert({
        id: "user-1",
        kind: "new_user_registration",
        email: "owner@example.com",
        title: "Owner",
      }),
      "/dashboard/smartrefill",
    );

    expect(href).toContain("/admin/data-management?");
    expect(href).toContain("q=owner%40example.com");
  });

  it("returns null when there is nothing to open", () => {
    expect(
      resolvePlatformAlertDataManagementPath(
        alert({ id: "empty", title: "" }),
        "/dashboard",
      ),
    ).toBeNull();
  });
});
