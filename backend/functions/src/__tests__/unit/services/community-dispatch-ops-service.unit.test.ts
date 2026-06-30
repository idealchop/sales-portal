import { describe, expect, it } from "vitest";
import type { CommunityDispatchRequestRow } from "../../../services/community-dispatch-ops-service";

function filterOpen(rows: CommunityDispatchRequestRow[]): CommunityDispatchRequestRow[] {
  const open = new Set([
    "parsed",
    "needs_location",
    "routing",
    "offered",
    "no_stations",
    "expired",
  ]);
  return rows.filter((row) => open.has(row.status));
}

describe("community dispatch ops queue filters", () => {
  it("treats offered and parsed as open", () => {
    const rows: CommunityDispatchRequestRow[] = [
      {
        id: "a",
        referenceId: "CM-1",
        status: "offered",
        createdAt: null,
        updatedAt: null,
        metaPsid: "psid-1",
      },
      {
        id: "b",
        referenceId: "CM-2",
        status: "accepted",
        createdAt: null,
        updatedAt: null,
        metaPsid: "psid-2",
      },
      {
        id: "c",
        referenceId: "CM-3",
        status: "parsed",
        createdAt: null,
        updatedAt: null,
        metaPsid: "psid-3",
      },
    ];

    expect(filterOpen(rows).map((row) => row.id)).toEqual(["a", "c"]);
  });
});
