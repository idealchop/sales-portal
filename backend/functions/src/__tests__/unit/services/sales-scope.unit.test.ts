import { describe, expect, it } from "vitest";
import { canAccessOwner } from "../../../services/sales-scope";

describe("sales-scope", () => {
  it("allows admin to access any owner", () => {
    expect(
      canAccessOwner(
        { uid: "admin-1", role: "admin" },
        "sales-9",
        "all",
      ),
    ).toBe(true);
  });

  it("restricts sales users to their own records", () => {
    expect(
      canAccessOwner(
        { uid: "sales-1", role: "sales" },
        "sales-1",
        ["sales-1"],
      ),
    ).toBe(true);
    expect(
      canAccessOwner(
        { uid: "sales-1", role: "sales" },
        "sales-2",
        ["sales-1"],
      ),
    ).toBe(false);
  });
});
