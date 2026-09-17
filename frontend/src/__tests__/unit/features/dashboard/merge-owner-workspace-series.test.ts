import { describe, expect, it } from "vitest";
import { mergeOwnerWorkspaceSeries } from "@/features/dashboard/lib/build-growth-chart-insights";

describe("mergeOwnerWorkspaceSeries", () => {
  it("merges owners and workspaces onto a shared date axis", () => {
    const merged = mergeOwnerWorkspaceSeries(
      [
        { date: "09-01", count: 1 },
        { date: "09-13", count: 4 },
      ],
      [
        { date: "09-01", count: 1 },
        { date: "09-10", count: 1 },
        { date: "09-13", count: 4 },
      ],
    );
    expect(merged).toEqual([
      { date: "09-01", owners: 1, workspaces: 1 },
      { date: "09-10", owners: 0, workspaces: 1 },
      { date: "09-13", owners: 4, workspaces: 4 },
    ]);
  });
});
