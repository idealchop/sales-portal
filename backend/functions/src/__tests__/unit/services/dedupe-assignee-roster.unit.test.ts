import { describe, expect, it } from "vitest";
import { dedupeAssigneeRoster } from "../../../lib/dedupe-assignee-roster";

describe("dedupeAssigneeRoster", () => {
  it("keeps the sign-in account when a sales profile repeats the name", () => {
    const rows = dedupeAssigneeRoster([
      {
        id: "sales-only",
        displayName: "Win Villanueva",
        email: "wina2@riverph.com",
        portalUser: false,
      },
      {
        id: "login",
        displayName: "Win Villanueva",
        email: "wina@riverph.com",
        portalUser: true,
      },
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        id: "login",
        aliasUids: ["sales-only"],
      }),
    ]);
  });
});
