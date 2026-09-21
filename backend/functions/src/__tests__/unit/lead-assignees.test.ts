import { describe, expect, it } from "vitest";
import {
  assigneeWriteFields,
  mergeAssigneeUids,
  normalizeAssigneeUids,
  removeAssigneeUids,
  resolveAssigneeUids,
} from "../../../src/lib/lead-assignees";

describe("lead-assignees", () => {
  it("writes canonical + legacy fields together", () => {
    expect(assigneeWriteFields(["a", "b"])).toEqual({
      assignedToUids: ["a", "b"],
      assignedToUid: "a",
    });
    expect(assigneeWriteFields([])).toEqual({
      assignedToUids: [],
      assignedToUid: null,
    });
  });

  it("merges and removes assignees", () => {
    expect(mergeAssigneeUids(["a"], ["b", "a"])).toEqual(["a", "b"]);
    expect(removeAssigneeUids(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
  });

  it("resolves legacy single assignee", () => {
    expect(resolveAssigneeUids({ assignedToUid: "x" })).toEqual(["x"]);
    expect(normalizeAssigneeUids([" x ", "x"])).toEqual(["x"]);
  });
});
