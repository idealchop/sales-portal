import { describe, expect, it } from "vitest";
import { parseCatalogSection } from "@/lib/admin/business-workspace-config-display";

describe("parseCatalogSection", () => {
  it("assigns unique keys when catalog entries share the same label", () => {
    const catalog = parseCatalogSection({
      waterTypes: [
        { name: "Purified (Dealer)" },
        { name: "Purified (Dealer)" },
      ],
    });

    const keys = catalog.waterTypes.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual([
      "water-0-Purified (Dealer)",
      "water-1-Purified (Dealer)",
    ]);
  });
});
