import { describe, expect, it } from "vitest";
import {
  BUSINESS_TRANSACTION_TABS,
  businessTransactionTypesForTab,
  filterBusinessTransactions,
} from "@/lib/admin/business-transaction-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

function tx(
  id: string,
  data: Record<string, unknown>,
): UserFirestoreDocumentRow {
  return {
    path: `businesses/b1/transactions/${id}`,
    collectionId: "transactions",
    documentId: id,
    label: id,
    isRoot: false,
    data,
  };
}

describe("business-transaction-list-display", () => {
  it("maps four tabs to transaction type filters", () => {
    expect(BUSINESS_TRANSACTION_TABS.map((tab) => tab.id)).toEqual([
      "walkin",
      "delivery_collection",
      "expense",
      "direct_sale",
    ]);
    expect(businessTransactionTypesForTab("walkin")).toEqual(["walkin"]);
    expect(businessTransactionTypesForTab("delivery_collection")).toEqual([
      "delivery",
      "collection",
    ]);
    expect(businessTransactionTypesForTab("expense")).toEqual(["expense"]);
    expect(businessTransactionTypesForTab("direct_sale")).toEqual([
      "direct_sale",
    ]);
  });

  it("filters transactions by search query", () => {
    const docs = [
      tx("1", {
        type: "walkin",
        customerName: "Ana Owner",
        referenceId: "TX-100",
        totalAmount: 120,
      }),
      tx("2", {
        type: "delivery",
        customerName: "Ben Rider",
        riderName: "Carlo",
        referenceId: "DL-200",
        totalAmount: 80,
      }),
    ];

    expect(filterBusinessTransactions(docs, "ana").map((d) => d.documentId)).toEqual([
      "1",
    ]);
    expect(
      filterBusinessTransactions(docs, "carlo").map((d) => d.documentId),
    ).toEqual(["2"]);
    expect(filterBusinessTransactions(docs, "TX-100")).toHaveLength(1);
    expect(filterBusinessTransactions(docs, "")).toHaveLength(2);
  });
});
