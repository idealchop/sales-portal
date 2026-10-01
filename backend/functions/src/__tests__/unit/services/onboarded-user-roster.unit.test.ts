import { describe, expect, it } from "vitest";
import type { LeadRecord } from "../../../services/leads-service";
import {
  applyOnboardedSmartRefillRoster,
  classifySmartRefillMember,
} from "../../../services/onboarded-user-roster";

function station(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "sr-business:b1",
    userId: "owner-1",
    businessName: "Oceanus Water Station",
    ownerName: "Oceanus Water Station",
    email: "jayvee@riverph.com",
    stage: "onboarded",
    attemptCount: 0,
    platformSource: "smartrefill",
    platformRole: "Owner",
    channels: {
      viber: false,
      email: false,
      messenger: false,
      smsCall: false,
    },
    linkedBusinessId: "b1",
    ...overrides,
  };
}

describe("classifySmartRefillMember", () => {
  it("treats the workspace owner as Owner and admin/rider as Staff", () => {
    expect(
      classifySmartRefillMember({ userId: "owner-1", ownerId: "owner-1", role: "staff" }),
    ).toBe("owner");
    expect(
      classifySmartRefillMember({ userId: "u2", ownerId: "owner-1", role: "admin" }),
    ).toBe("staff");
    expect(
      classifySmartRefillMember({ userId: "u3", ownerId: "owner-1", role: "rider" }),
    ).toBe("staff");
  });
});

describe("applyOnboardedSmartRefillRoster", () => {
  it("stamps customer totals and adds a staff row for the same station", () => {
    const rows = applyOnboardedSmartRefillRoster(
      [station()],
      [{ businessId: "b1", ownerId: "owner-1", customerCount: 42 }],
      [
        { businessId: "b1", userId: "owner-1", role: "owner", name: "Jayvee" },
        {
          businessId: "b1",
          userId: "staff-1",
          role: "staff",
          name: "Ana Cruz",
          email: "ana@example.com",
        },
      ],
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: "sr-business:b1",
      platformRole: "Owner",
      customerCount: 42,
    });
    expect(rows[1]).toMatchObject({
      id: "sr-staff:b1:staff-1",
      userId: "staff-1",
      ownerName: "Ana Cruz",
      email: "ana@example.com",
      businessName: "Oceanus Water Station",
      platformRole: "Staff",
      platformSource: "smartrefill",
      customerCount: 42,
      stage: "onboarded",
    });
  });

  it("does not duplicate a staff user already stored as a lead", () => {
    const rows = applyOnboardedSmartRefillRoster(
      [
        station(),
        station({
          id: "sr-staff:b1:staff-1",
          userId: "staff-1",
          ownerName: "Ana Cruz",
          platformRole: "Owner",
        }),
      ],
      [{ businessId: "b1", ownerId: "owner-1", customerCount: 3 }],
      [
        { businessId: "b1", userId: "staff-1", role: "staff", name: "Ana Cruz" },
      ],
    );

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.userId === "staff-1")).toMatchObject({
      platformRole: "Staff",
      customerCount: 3,
    });
  });

  it("leaves non-SmartRefill rows unchanged", () => {
    const legacy = station({
      id: "sr-legacy:station:x",
      platformSource: "smartrefill_legacy",
      stage: "registered",
    });
    const rows = applyOnboardedSmartRefillRoster(
      [legacy],
      [{ businessId: "b1", customerCount: 9 }],
      [],
    );
    expect(rows).toEqual([legacy]);
  });
});
