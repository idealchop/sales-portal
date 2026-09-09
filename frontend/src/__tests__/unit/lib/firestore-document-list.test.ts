import { describe, expect, it } from "vitest";
import {
  firestoreDocumentListTitle,
  firestoreDocumentSummary,
  listFirestoreDocumentHighlightFields,
} from "@/lib/admin/firestore-document-list";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

function doc(
  data: Record<string, unknown>,
  collectionId = "alert_delivery_log",
): UserFirestoreDocumentRow {
  return {
    path: `businesses/b1/${collectionId}/doc1`,
    collectionId,
    documentId: "doc1",
    label: "doc1",
    isRoot: false,
    data,
  };
}

describe("listFirestoreDocumentHighlightFields", () => {
  it("shows important alert delivery fields and skips nested detail", () => {
    const fields = listFirestoreDocumentHighlightFields(
      doc({
        channel: "push",
        category: "new_order_push",
        status: "sent",
        audience: "owner",
        recipientCount: 2,
        successCount: 2,
        failureCount: 0,
        detail: { orderId: "o1", nested: true },
        createdAt: "2026-09-09T01:00:00.000Z",
        noiseField: "ignore-me-later",
      }),
    );

    expect(fields.map((field) => field.key)).toEqual([
      "channel",
      "category",
      "status",
      "audience",
      "createdAt",
      "successCount",
    ]);
    expect(fields.some((field) => field.key === "detail")).toBe(false);
  });

  it("uses a readable title from category when present", () => {
    expect(
      firestoreDocumentListTitle(
        doc({ category: "new_order_push", channel: "push" }),
      ),
    ).toBe("new order push");
  });

  it("keeps summary compact for legacy callers", () => {
    expect(
      firestoreDocumentSummary(
        doc({
          channel: "email",
          category: "customer_txn_status",
          status: "sent",
          extra: "x",
        }),
      ),
    ).toBe(
      "channel: email · category: customer_txn_status · status: sent",
    );
  });
});
