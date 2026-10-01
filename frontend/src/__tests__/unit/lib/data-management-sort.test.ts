import { describe, expect, it } from "vitest";
import {
  buildSubscriptionFilterOptions,
  filterDataManagementRows,
  formatActiveSubscriptionPeriodLine,
  formatActiveSubscriptionTitle,
  sortDataManagementRows,
} from "@/lib/admin/data-management";

describe("sortDataManagementRows", () => {
  it("sorts by latest sign-in first by default order", () => {
    const sorted = sortDataManagementRows(
      [
        {
          userId: "a",
          status: "linked",
          lastSignInAt: "2026-01-01T00:00:00.000Z",
        },
        {
          userId: "b",
          status: "linked",
          lastSignInAt: "2026-06-01T00:00:00.000Z",
        },
        {
          userId: "c",
          status: "linked",
          lastSignInAt: null,
        },
      ],
      "lastSignIn",
      "desc",
    );

    expect(sorted.map((row) => row.userId)).toEqual(["b", "a", "c"]);
  });

  it("labels a trial by the plan being tried and can filter to trials", () => {
    const trial = {
      userId: "trial",
      status: "linked" as const,
      activeSubscription: {
        planName: "Scale",
        billingCycle: "trial",
        status: "active",
        addonNames: [],
        createdAt: "2026-09-20T00:00:00.000Z",
        expiresAt: "2026-10-20T00:00:00.000Z",
      },
    };
    const paid = {
      userId: "paid",
      status: "linked" as const,
      activeSubscription: {
        planName: "Scale",
        billingCycle: "monthly",
        status: "active",
        addonNames: [],
      },
    };

    expect(formatActiveSubscriptionTitle(trial.activeSubscription)).toBe("Scale · Trial");
    expect(formatActiveSubscriptionTitle(paid.activeSubscription)).toBe("Scale");
    expect(formatActiveSubscriptionPeriodLine(trial.activeSubscription)).toContain("·");

    const options = buildSubscriptionFilterOptions([trial, paid]);
    expect(options.map((option) => option.label)).toContain("Trial");
    expect(options.map((option) => option.label)).toContain("Scale · Trial");

    expect(
      filterDataManagementRows([trial, paid], "", "all", "all", "trial").map(
        (row) => row.userId,
      ),
    ).toEqual(["trial"]);
  });
});
