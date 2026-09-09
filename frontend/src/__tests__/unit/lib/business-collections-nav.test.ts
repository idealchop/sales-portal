import { describe, expect, it } from "vitest";
import {
  filterBusinessCollectionGroups,
  groupBusinessCollectionsByCategory,
  resolveBusinessCollectionMeta,
} from "@/lib/admin/business-collections-nav";

describe("business-collections-nav", () => {
  const groups = [
    { collectionId: "locations", title: "Locations", documents: [], totalCount: 3 },
    { collectionId: "orders", title: "Orders", documents: [], totalCount: 12 },
    { collectionId: "mystery", title: "Mystery", documents: [], totalCount: 1 },
  ];

  it("resolves known collection metadata", () => {
    const meta = resolveBusinessCollectionMeta("locations", "Locations");
    expect(meta.categoryId).toBe("operations");
    expect(meta.description).toContain("locations");
  });

  it("resolves alert delivery under communications", () => {
    const meta = resolveBusinessCollectionMeta(
      "alert_delivery_log",
      "Alert delivery log",
    );
    expect(meta.categoryId).toBe("communications");
    expect(meta.description.toLowerCase()).toContain("delivery");
  });

  it("filters and groups collections for navigation", () => {
    expect(filterBusinessCollectionGroups(groups, "order")).toEqual([
      groups[1],
    ]);
    const categorized = groupBusinessCollectionsByCategory([
      ...groups,
      {
        collectionId: "alert_delivery_log",
        title: "Alert delivery log",
        documents: [],
        totalCount: 10,
      },
    ]);
    expect(categorized.map((entry) => entry.categoryId)).toEqual([
      "communications",
      "operations",
      "commerce",
      "other",
    ]);
  });
});
