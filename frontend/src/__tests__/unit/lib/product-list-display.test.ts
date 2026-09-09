import { describe, expect, it } from "vitest";
import {
  parseProductListRow,
  productSearchText,
  sortProductDocuments,
} from "@/lib/admin/product-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

function product(
  id: string,
  data: Record<string, unknown>,
): UserFirestoreDocumentRow {
  return {
    path: `businesses/b1/products/${id}`,
    collectionId: "products",
    documentId: id,
    label: id,
    isRoot: false,
    data,
  };
}

describe("product-list-display", () => {
  it("parses product details for the list table", () => {
    const row = parseProductListRow(
      product("p1", {
        name: "Purified",
        unitPrice: 45,
        active: true,
        showInCustomerOrder: true,
        defaultForOrder: true,
        itemOnly: false,
        iconId: "round-gallon",
        components: [{ inventoryItemId: "inv1", quantity: 1 }],
      }),
    );

    expect(row.name).toBe("Purified");
    expect(row.priceLabel).toBe("₱45");
    expect(row.activeLabel).toBe("Active");
    expect(row.kindLabel).toBe("Water refill");
    expect(row.visibilityLabel).toContain("Default");
    expect(row.componentsLabel).toBe("1 SKU");
  });

  it("sorts active defaults first and supports search", () => {
    const docs = [
      product("b", { name: "Beta", unitPrice: 50, active: false }),
      product("a", {
        name: "Alpha",
        unitPrice: 40,
        active: true,
        defaultForOrder: true,
      }),
      product("c", { name: "Charlie", unitPrice: 30, active: true }),
    ];

    expect(sortProductDocuments(docs).map((d) => d.documentId)).toEqual([
      "a",
      "c",
      "b",
    ]);
    expect(
      docs.filter((doc) => productSearchText(doc).includes("alpha")),
    ).toHaveLength(1);
  });
});
