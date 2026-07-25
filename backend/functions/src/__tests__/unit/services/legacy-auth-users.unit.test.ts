import { beforeEach, describe, expect, it } from "vitest";
import {
  clearLegacyAuthUsersCache,
  findLegacyAuthUser,
  getLegacyAuthUsers,
} from "../../../services/legacy-auth-users";

describe("legacy-auth-users", () => {
  beforeEach(() => {
    clearLegacyAuthUsersCache();
  });

  it("loads sanitized auth export users", () => {
    const users = getLegacyAuthUsers();
    expect(users.length).toBeGreaterThan(0);
    expect(users[0]).toMatchObject({
      localId: expect.any(String),
      email: expect.any(String),
    });
    expect(users[0]).not.toHaveProperty("passwordHash");
    expect(users[0]).not.toHaveProperty("salt");
  });

  it("finds users by localId and email", () => {
    const sample = getLegacyAuthUsers()[0];
    expect(findLegacyAuthUser({ localId: sample.localId })?.email).toBe(
      sample.email,
    );
    expect(
      findLegacyAuthUser({ email: sample.email.toUpperCase() })?.localId,
    ).toBe(sample.localId);
    expect(findLegacyAuthUser({ localId: "missing", email: "nope@x.com" })).toBeNull();
  });
});
