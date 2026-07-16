import { describe, expect, it } from "vitest";
import { sortDataManagementRows } from "@/lib/admin/data-management";

describe("sortDataManagementRows", () => {
  it("sorts by latest sign-in first by default order", () => {
    const sorted = sortDataManagementRows(
      [
        {
          userId: "a",
          status: "linked",
          lastSignInAt: "2026-01-01T00:00:00.000Z",
        },
        {
          userId: "b",
          status: "linked",
          lastSignInAt: "2026-06-01T00:00:00.000Z",
        },
        {
          userId: "c",
          status: "linked",
          lastSignInAt: null,
        },
      ],
      "lastSignIn",
      "desc",
    );

    expect(sorted.map((row) => row.userId)).toEqual(["b", "a", "c"]);
  });
});
