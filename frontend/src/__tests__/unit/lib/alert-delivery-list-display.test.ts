import { describe, expect, it } from "vitest";
import {
  alertDeliveryCategoryLabel,
  matchesAlertDeliveryFilter,
  parseAlertDeliveryListRow,
  sortAlertDeliveryDocuments,
} from "@/lib/admin/alert-delivery-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

function doc(
  data: Record<string, unknown>,
  documentId = "doc1",
): UserFirestoreDocumentRow {
  return {
    path: `businesses/b1/alert_delivery_log/${documentId}`,
    collectionId: "alert_delivery_log",
    documentId,
    label: documentId,
    isRoot: false,
    data,
  };
}

describe("alert-delivery-list-display", () => {
  it("parses important delivery fields for the list table", () => {
    const row = parseAlertDeliveryListRow(
      doc({
        channel: "push",
        category: "new_order_push",
        status: "sent",
        audience: "owner",
        recipientCount: 2,
        successCount: 2,
        failureCount: 0,
        detail: { orderId: "ORD-1" },
        createdAt: "2026-09-09T01:00:00.000Z",
      }),
    );

    expect(row.categoryLabel).toBe("New order push");
    expect(row.channelLabel).toBe("Push");
    expect(row.statusLabel).toBe("Sent");
    expect(row.audienceLabel).toBe("Owner");
    expect(row.countsLabel).toBe("2 devices");
    expect(row.detailSummary).toContain("ORD-1");
  });

  it("humanizes unknown categories and filters by status/channel", () => {
    expect(alertDeliveryCategoryLabel("custom_blast")).toBe("Custom blast");
    const failed = doc({ channel: "email", status: "failed" });
    expect(matchesAlertDeliveryFilter(failed, "status:failed")).toBe(true);
    expect(matchesAlertDeliveryFilter(failed, "channel:push")).toBe(false);
  });

  it("sorts newest first", () => {
    const sorted = sortAlertDeliveryDocuments([
      doc({ createdAt: "2026-09-01T00:00:00.000Z" }, "old"),
      doc({ createdAt: "2026-09-09T00:00:00.000Z" }, "new"),
    ]);
    expect(sorted.map((entry) => entry.documentId)).toEqual(["new", "old"]);
  });
});
