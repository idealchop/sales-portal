import { describe, expect, it } from "vitest";
import {
  groupUiConfigRows,
  parseCatalogSection,
  parseUiConfigRows,
} from "@/lib/admin/business-workspace-config-display";

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

describe("groupUiConfigRows", () => {
  it("groups workspace uiConfig flags into readable sections", () => {
    const rows = parseUiConfigRows({
      uiConfig: {
        autoMorningBriefEnabled: true,
        gettingStartedCelebrationShown: true,
        dormantThresholdDays: 15,
        dismissedDuplicateCustomerIds: ["c1", "c2"],
        customMysteryFlag: false,
      },
    });

    const groups = groupUiConfigRows(rows);
    expect(groups.map((group) => group.id)).toEqual([
      "onboarding",
      "alerts",
      "hygiene",
      "other",
    ]);
    expect(
      groups.find((group) => group.id === "hygiene")?.rows[0]?.value,
    ).toBe("2 items");
  });
});
