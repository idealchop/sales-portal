import { describe, expect, it } from "vitest";
import { attachInactiveOwnerContactedAt } from "../../../services/inactive-owner-contacts-service";

describe("attachInactiveOwnerContactedAt", () => {
  it("merges contacted timestamps onto owners", () => {
    const owners = [
      { id: "biz-1", businessName: "A" },
      { id: "biz-2", businessName: "B" },
    ];
    const contactedAt = new Map([["biz-1", "2026-07-20T00:00:00.000Z"]]);
    const result = attachInactiveOwnerContactedAt(owners, contactedAt);
    expect(result[0]?.lastContactedAt).toBe("2026-07-20T00:00:00.000Z");
    expect(result[1]?.lastContactedAt).toBeNull();
  });
});
