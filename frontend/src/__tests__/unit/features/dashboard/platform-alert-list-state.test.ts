import { describe, expect, it } from "vitest";
import {
  buildPlatformAlertsSummary,
  dismissPlatformAlertFromSummary,
  filterDismissedPlatformAlerts,
} from "@/features/dashboard/lib/platform-alert-list-state";
import type { PlatformAlert } from "@/lib/dashboard/analytics";

function alert(
  overrides: Partial<PlatformAlert> & Pick<PlatformAlert, "id" | "kind">,
): PlatformAlert {
  return {
    title: overrides.id,
    subtitle: "x",
    occurredAt: null,
    ...overrides,
  };
}

describe("platform-alert-list-state", () => {
  const items = [
    alert({ id: "a", kind: "demo_inquiry" }),
    alert({ id: "b", kind: "subscription_change" }),
    alert({ id: "c", kind: "subscription_change" }),
  ];

  it("filters dismissed ids so stale refreshes cannot revive them", () => {
    expect(
      filterDismissedPlatformAlerts(items, new Set(["b"])).map((row) => row.id),
    ).toEqual(["a", "c"]);
  });

  it("rebuilds counts after dismiss", () => {
    const summary = dismissPlatformAlertFromSummary(
      buildPlatformAlertsSummary(items),
      "b",
    );
    expect(summary.items.map((row) => row.id)).toEqual(["a", "c"]);
    expect(summary.counts.subscription_change).toBe(1);
    expect(summary.counts.demo_inquiry).toBe(1);
  });
});
