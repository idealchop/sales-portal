import { describe, expect, it } from "vitest";
import {
  collectTestAccountOwnerIds,
  isTestAccountOwnerId,
  normalizeAuthAccountTagInput,
  readAuthAccountTag,
  readFirestoreAuthAccountTag,
} from "../../../src/services/auth-account-tag";

describe("auth-account-tag", () => {
  it("reads test tag from custom claims and Firestore", () => {
    expect(
      readAuthAccountTag(
        { customClaims: { authAccountTag: "test" } } as never,
        {},
      ),
    ).toBe("test");
    expect(readAuthAccountTag(null, { authAccountTag: "test" })).toBe("test");
    expect(readAuthAccountTag(null, {})).toBeNull();
  });

  it("reads authAccountTag from Firestore user data", () => {
    expect(readFirestoreAuthAccountTag({ authAccountTag: "test" })).toBe("test");
    expect(readFirestoreAuthAccountTag({})).toBeNull();
  });

  it("normalizes patch input", () => {
    expect(normalizeAuthAccountTagInput("test")).toBe("test");
    expect(normalizeAuthAccountTagInput(null)).toBeNull();
    expect(normalizeAuthAccountTagInput("qa")).toBeUndefined();
  });

  it("collects test account owner ids from authAccountTag field", () => {
    const ids = collectTestAccountOwnerIds([
      { id: "owner-test", data: { authAccountTag: "test" } },
      { id: "owner-live", data: {} },
    ]);

    expect([...ids]).toEqual(["owner-test"]);
    expect(isTestAccountOwnerId("owner-test", ids)).toBe(true);
    expect(isTestAccountOwnerId("owner-live", ids)).toBe(false);
  });
});
