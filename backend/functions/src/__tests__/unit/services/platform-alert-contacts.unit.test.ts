import { describe, expect, it } from "vitest";
import { attachContactStatusToAlerts } from "../../../services/platform-alert-contacts-service";
import type { PlatformAlertsSummary } from "../../../services/build-platform-alerts";

describe("attachContactStatusToAlerts", () => {
  const summary: PlatformAlertsSummary = {
    items: [
      {
        id: "demo-inq-1",
        kind: "demo_inquiry",
        title: "Jaime",
        subtitle: "Inquire for demo",
        occurredAt: "2026-07-02T00:00:00.000Z",
      },
      {
        id: "user-user-1",
        kind: "new_user_registration",
        title: "New Owner",
        subtitle: "New SmartRefill user",
        occurredAt: "2026-07-01T00:00:00.000Z",
      },
    ],
    counts: {
      demo_inquiry: 1,
      new_user_registration: 1,
      subscription_change: 0,
      subscription_expiring_soon: 0,
      subscription_grace_period: 0,
    },
  };

  it("defaults missing statuses to need_contact", () => {
    const result = attachContactStatusToAlerts(summary, new Map());
    expect(result.items[0]?.contactStatus).toBe("need_contact");
    expect(result.items[1]?.contactStatus).toBe("need_contact");
  });

  it("merges stored contact statuses by alert id", () => {
    const result = attachContactStatusToAlerts(
      summary,
      new Map([["demo-inq-1", "contacted"]]),
    );
    expect(result.items[0]?.contactStatus).toBe("contacted");
    expect(result.items[1]?.contactStatus).toBe("need_contact");
  });
});
