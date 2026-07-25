import { describe, expect, it } from "vitest";
import {
  LEGACY_CONTACT_COOLDOWN_DAYS,
  resolveLegacyContactFields,
  resolveLegacyStationTriageStatus,
} from "../../../services/legacy-smartrefill-station-actions";

describe("resolveLegacyContactFields", () => {
  it("falls back to Auth export email when Firestore email is missing", () => {
    expect(
      resolveLegacyContactFields({
        firestoreEmail: "",
        firestoreOwnerName: "",
        firestoreBusinessName: "Station",
        firestoreDisplayName: "",
        authEmail: "owner@example.com",
        authDisplayName: "Owner From Auth",
      }),
    ).toEqual({
      email: "owner@example.com",
      ownerName: "Owner From Auth",
      businessName: "Station",
    });
  });

  it("prefers Firestore email over Auth export", () => {
    expect(
      resolveLegacyContactFields({
        firestoreEmail: "firestore@example.com",
        firestoreOwnerName: "Firestore Owner",
        firestoreBusinessName: "Biz",
        firestoreDisplayName: "Display",
        authEmail: "auth@example.com",
        authDisplayName: "Auth Owner",
      }).email,
    ).toBe("firestore@example.com");
  });
});

describe("resolveLegacyStationTriageStatus", () => {
  const nowMs = Date.parse("2026-07-24T12:00:00.000Z");

  it("keeps ignored stations handled forever", () => {
    expect(
      resolveLegacyStationTriageStatus({
        ignored: true,
        contacted: true,
        contactedAt: "2020-01-01T00:00:00.000Z",
        nowMs,
      }),
    ).toBe("ignored");
  });

  it("treats recent contacted as contacted", () => {
    expect(
      resolveLegacyStationTriageStatus({
        ignored: false,
        contacted: true,
        contactedAt: "2026-07-20T12:00:00.000Z",
        nowMs,
      }),
    ).toBe("contacted");
  });

  it(`returns contacted stations to open after ${LEGACY_CONTACT_COOLDOWN_DAYS} days`, () => {
    const expiredAt = new Date(
      nowMs - LEGACY_CONTACT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000 - 1,
    ).toISOString();
    expect(
      resolveLegacyStationTriageStatus({
        ignored: false,
        contacted: true,
        contactedAt: expiredAt,
        nowMs,
      }),
    ).toBe("open");
  });

  it("is open when never contacted", () => {
    expect(
      resolveLegacyStationTriageStatus({
        ignored: false,
        contacted: false,
        contactedAt: null,
        nowMs,
      }),
    ).toBe("open");
  });
});
