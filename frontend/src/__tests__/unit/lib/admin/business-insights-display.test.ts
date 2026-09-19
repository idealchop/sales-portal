import { describe, expect, it } from "vitest";
import {
  computeBusinessInsights,
  classifyTransactionRefillQuantities,
  classifyInsightTransactionKind,
  buildWaterContainerIconIds,
} from "@/lib/admin/business-insights-display";
import type { BusinessFirestoreDocumentRow } from "@/lib/admin/business-profile-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

function product(
  id: string,
  data: Record<string, unknown>,
): BusinessFirestoreDocumentRow {
  return {
    path: `businesses/b1/products/${id}`,
    collectionId: "products",
    documentId: id,
    label: id,
    isRoot: false,
    data,
  };
}

function transaction(
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

describe("classifyTransactionRefillQuantities", () => {
  const productById = new Map([
    ["round", { itemOnly: false, iconId: "round-gallon" }],
    ["bottle", { itemOnly: false, iconId: "350-ml" }],
  ]);
  const icons = buildWaterContainerIconIds([
    { documentId: "round-gallon", data: { waterContainer: true } },
    { documentId: "350-ml", data: { waterContainer: false } },
  ]);

  it("splits gallon qty from bottle qty on the same ticket", () => {
    expect(
      classifyTransactionRefillQuantities(
        {
          type: "walkin",
          deliveryStatus: "completed",
          waterRefills: [
            { productId: "bottle", quantity: 21 },
            { productId: "round", quantity: 21 },
          ],
        },
        productById,
        icons,
      ),
    ).toEqual({ waterContainers: 21, other: 21 });
  });

  it("classifies bottles from line names when products are not loaded", () => {
    expect(
      classifyTransactionRefillQuantities(
        {
          type: "walkin",
          deliveryStatus: "completed",
          waterRefills: [
            { name: "350ml Mineral Bottle", productId: "x1", quantity: 21 },
            { name: "Round Purified", productId: "x2", quantity: 21 },
          ],
        },
        new Map(),
        icons,
      ),
    ).toEqual({ waterContainers: 21, other: 21 });
  });
});

describe("computeBusinessInsights transaction activity", () => {
  it("combines ticket count with water-container and other refill quantities", () => {
    const now = new Date();
    const today = now.toISOString();
    const insights = computeBusinessInsights({
      documents: [
        product("round", { iconId: "round-gallon", itemOnly: false }),
        product("bottle", { iconId: "350-ml", itemOnly: false }),
        {
          path: "businesses/b1/subscriptions/s1",
          collectionId: "subscriptions",
          documentId: "s1",
          label: "Free",
          isRoot: false,
          data: { planCode: "free", planName: "Free", status: "active" },
        },
      ],
      productIcons: [
        { documentId: "round-gallon", data: { waterContainer: true } },
        { documentId: "350-ml", data: { waterContainer: false } },
      ],
      transactions: [
        transaction("t1", {
          type: "walkin",
          createdAt: today,
          waterRefills: [{ productId: "round", quantity: 11 }],
        }),
        transaction("t2", {
          type: "walkin",
          createdAt: today,
          waterRefills: [{ productId: "round", quantity: 1 }],
        }),
        transaction("t3", {
          type: "walkin",
          createdAt: today,
          waterRefills: [
            { productId: "bottle", quantity: 21 },
            { productId: "round", quantity: 21 },
          ],
        }),
        transaction("t4", {
          type: "walkin",
          createdAt: today,
          waterRefills: [{ productId: "round", quantity: 2 }],
        }),
      ],
    });

    const todayRow = insights.transactionDaily[insights.transactionDaily.length - 1];
    expect(todayRow?.transactions).toBe(4);
    expect(todayRow?.waterContainers).toBe(35);
    expect(todayRow?.other).toBe(21);

    const meter = insights.consumption.find((row) => row.id === "transactions");
    expect(meter?.used).toBe(35);
    expect(meter?.used).not.toBe(4);
  });

  it("splits tickets, gallons, and bottles from refill names when products are lazy-loaded", () => {
    const now = new Date();
    const today = now.toISOString();
    const insights = computeBusinessInsights({
      documents: [
        {
          path: "businesses/b1/subscriptions/s1",
          collectionId: "subscriptions",
          documentId: "s1",
          label: "Free",
          isRoot: false,
          data: { planCode: "free", planName: "Free", status: "active" },
        },
      ],
      productIcons: [
        { documentId: "round-gallon", data: { waterContainer: true } },
        { documentId: "350-ml", data: { waterContainer: false } },
      ],
      transactions: [
        transaction("t1", {
          type: "walkin",
          createdAt: today,
          waterRefills: [{ name: "Round Purified", quantity: 11 }],
        }),
        transaction("t2", {
          type: "walkin",
          createdAt: today,
          waterRefills: [{ name: "Round Purified", quantity: 1 }],
        }),
        transaction("t3", {
          type: "walkin",
          createdAt: today,
          waterRefills: [
            { name: "350ml Mineral Bottle", quantity: 21 },
            { name: "Round Purified", quantity: 21 },
          ],
        }),
        transaction("t4", {
          type: "walkin",
          createdAt: today,
          waterRefills: [{ name: "Round Purified", quantity: 2 }],
        }),
      ],
    });

    const todayRow = insights.transactionDaily[insights.transactionDaily.length - 1];
    expect(todayRow).toMatchObject({
      transactions: 4,
      waterContainers: 35,
      other: 21,
    });
    expect(insights.consumption.find((row) => row.id === "transactions")?.used).toBe(
      35,
    );
  });
});

describe("classifyInsightTransactionKind", () => {
  it("splits delivery into manual vs QR portal, and maps walk-in / direct / collection", () => {
    expect(classifyInsightTransactionKind({ type: "delivery" })).toBe(
      "deliveryManual",
    );
    expect(
      classifyInsightTransactionKind({
        type: "delivery",
        notes: "Accepted portal order",
      }),
    ).toBe("deliveryQr");
    expect(classifyInsightTransactionKind({ type: "walkin" })).toBe("walkin");
    expect(classifyInsightTransactionKind({ type: "direct_sale" })).toBe("direct");
    expect(classifyInsightTransactionKind({ type: "collection" })).toBe(
      "collection",
    );
    expect(classifyInsightTransactionKind({ type: "expense" })).toBeNull();
  });
});

describe("computeBusinessInsights order mix", () => {
  it("counts today's tickets by channel", () => {
    const today = new Date().toISOString();
    const insights = computeBusinessInsights({
      documents: [],
      transactions: [
        transaction("d1", { type: "delivery", createdAt: today }),
        transaction("d2", {
          type: "delivery",
          createdAt: today,
          notes: "portal order",
        }),
        transaction("w1", { type: "walkin", createdAt: today }),
        transaction("s1", { type: "direct_sale", createdAt: today }),
        transaction("c1", { type: "collection", createdAt: today }),
        transaction("e1", { type: "expense", createdAt: today }),
      ],
    });
    const todayRow = insights.mixDaily[insights.mixDaily.length - 1];
    expect(todayRow).toMatchObject({
      deliveryManual: 1,
      deliveryQr: 1,
      walkin: 1,
      direct: 1,
      collection: 1,
    });
  });
});
