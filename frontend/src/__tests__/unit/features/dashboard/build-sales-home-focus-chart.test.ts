import { describe, expect, it } from "vitest";
import { buildSalesHomeFocusChart } from "@/features/dashboard/lib/build-sales-home-focus-chart";
import type { SalesHomeStationRow } from "@/features/dashboard/lib/build-sales-home-focus";

function row(
  overrides: Partial<SalesHomeStationRow> & Pick<SalesHomeStationRow, "id" | "intent">,
): SalesHomeStationRow {
  return {
    businessName: "Station",
    now: "Now",
    shouldBe: "Should",
    whatIf: "If",
    nowLevel: 1,
    shouldLevel: 4,
    stageLabel: "Talking with us",
    assignedToYou: false,
    canAssign: false,
    hasLead: true,
    links: [],
    chance: {
      percent: 40,
      kind: "onboard",
      label: "Chance they onboard",
      why: "test",
    },
    ...overrides,
  };
}

describe("buildSalesHomeFocusChart", () => {
  it("groups stations by gap and chance band without money fields", () => {
    const chart = buildSalesHomeFocusChart([
      row({
        id: "a",
        intent: "hello",
        chance: {
          percent: 20,
          kind: "onboard",
          label: "Chance they onboard",
          why: "hello",
        },
      }),
      row({
        id: "b",
        intent: "hello",
        chance: {
          percent: 25,
          kind: "onboard",
          label: "Chance they onboard",
          why: "hello",
        },
      }),
      row({
        id: "c",
        intent: "close_deal",
        chance: {
          percent: 55,
          kind: "onboard",
          label: "Chance they onboard",
          why: "demo",
        },
      }),
    ]);

    expect(chart.total).toBe(3);
    expect(chart.avgChance).toBe(33);
    expect(chart.byIntent.map((item) => item.label)).toEqual([
      "Say hello",
      "Stalled demo",
    ]);
    expect(chart.byIntent[0]?.count).toBe(2);
    expect(chart.byIntent[0]?.avgChance).toBe(23);
    expect(chart.byChanceBand).toEqual([
      { band: "Low", count: 2 },
      { band: "Mid", count: 0 },
      { band: "High", count: 1 },
    ]);
    expect(JSON.stringify(chart)).not.toMatch(/₱|commission|pipelineValue/i);
  });
});
