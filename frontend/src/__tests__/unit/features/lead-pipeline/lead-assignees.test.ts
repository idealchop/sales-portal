import { describe, expect, it } from "vitest";
import {
  dedupeAssigneeRoster,
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

  it("shows one row when a sales-only profile repeats a sign-in name", () => {
    const rows = dedupeAssigneeRoster([
      {
        id: "sales-only",
        displayName: "Win Villanueva",
        email: "wina2@riverph.com",
      },
      {
        id: "login",
        displayName: "Win Villanueva",
        email: "wina@riverph.com",
        portalUser: true,
      },
      {
        id: "jamie",
        displayName: "Jamie Camille Regalado",
        portalUser: true,
      },
    ]);

    expect(rows.map((row) => row.displayName)).toEqual([
      "Win Villanueva",
      "Jamie Camille Regalado",
    ]);
    expect(rows[0]?.id).toBe("login");
    expect(rows[0]?.aliasUids).toEqual(["sales-only"]);
  });

  it("keeps two sign-in accounts that share a display name", () => {
    const rows = dedupeAssigneeRoster([
      { id: "a", displayName: "Alex Reyes", portalUser: true },
      { id: "b", displayName: "Alex Reyes", portalUser: true },
    ]);

    expect(rows.map((row) => row.id).sort()).toEqual(["a", "b"]);
  });
});
