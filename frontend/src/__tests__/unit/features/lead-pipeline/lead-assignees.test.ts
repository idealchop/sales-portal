import { describe, expect, it } from "vitest";
import {
  leadHasAssignee,
  leadIsUnassigned,
  normalizeAssigneeUids,
  resolveAssigneeUids,
} from "@/features/lead-pipeline/lib/lead-assignees";

describe("lead assignees", () => {
  it("normalizes and dedupes assignee uids", () => {
    expect(normalizeAssigneeUids([" a ", "b", "a", "", "b"])).toEqual([
      "a",
      "b",
    ]);
    expect(normalizeAssigneeUids("solo")).toEqual(["solo"]);
    expect(normalizeAssigneeUids(null)).toEqual([]);
  });

  it("prefers assignedToUids over legacy assignedToUid", () => {
    expect(
      resolveAssigneeUids({
        assignedToUids: ["u1", "u2"],
        assignedToUid: "legacy",
      }),
    ).toEqual(["u1", "u2"]);
    expect(resolveAssigneeUids({ assignedToUid: "legacy" })).toEqual([
      "legacy",
    ]);
  });

  it("checks membership and unassigned", () => {
    const lead = { assignedToUids: ["a", "b"] };
    expect(leadHasAssignee(lead, "b")).toBe(true);
    expect(leadHasAssignee(lead, "c")).toBe(false);
    expect(leadIsUnassigned({ assignedToUid: "" })).toBe(true);
    expect(leadIsUnassigned(lead)).toBe(false);
  });
});
