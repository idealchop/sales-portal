import { describe, expect, it } from "vitest";
import { resolveGuestRegistrationEnabled } from "../../../../services/events-training/webinars-service";

describe("resolveGuestRegistrationEnabled", () => {
  it("defaults true for public when unset", () => {
    expect(resolveGuestRegistrationEnabled("public", undefined)).toBe(true);
    expect(resolveGuestRegistrationEnabled("public", null)).toBe(true);
  });

  it("respects explicit false on public", () => {
    expect(resolveGuestRegistrationEnabled("public", false)).toBe(false);
  });

  it("forces false for private; premium is opt-in only", () => {
    expect(resolveGuestRegistrationEnabled("private", true)).toBe(false);
    expect(resolveGuestRegistrationEnabled("premium", undefined)).toBe(false);
    expect(resolveGuestRegistrationEnabled("premium", false)).toBe(false);
    expect(resolveGuestRegistrationEnabled("premium", true)).toBe(true);
  });
});
