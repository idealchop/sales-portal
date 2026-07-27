import { describe, expect, it } from "vitest";
import { remapClonePayload } from "../../../utils/firestore-tree";

describe("remapClonePayload", () => {
  it("remaps exact string id matches deeply", () => {
    const result = remapClonePayload(
      {
        ownerId: "owner-1",
        nested: { businessId: "biz-1", other: "keep" },
        list: ["owner-1", "x"],
      },
      { "owner-1": "demo-uid", "biz-1": "demo_biz" },
    );
    expect(result).toEqual({
      ownerId: "demo-uid",
      nested: { businessId: "demo_biz", other: "keep" },
      list: ["demo-uid", "x"],
    });
  });

  it("does not partially replace substrings", () => {
    expect(
      remapClonePayload("owner-1-extra", { "owner-1": "demo-uid" }),
    ).toBe("owner-1-extra");
  });
});
