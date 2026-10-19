import { describe, expect, it } from "vitest";
import { buildNewJoiners } from "../../../services/build-new-joiners";

describe("buildNewJoiners", () => {
  it("sorts joiners by joinedAt descending", () => {
    const result = buildNewJoiners({
      salesDocs: [
        {
          id: "rep-old",
          data: () => ({
            displayName: "Old Rep",
            createdAt: "2026-05-01T00:00:00.000Z",
            onboardingCompleted: true,
          }),
        },
        {
          id: "rep-new",
          data: () => ({
            displayName: "New Rep",
            createdAt: "2026-06-15T00:00:00.000Z",
            onboardingCompleted: false,
            role: "sales",
          }),
        },
      ],
      recentBusinesses: [
        {
          id: "biz-1",
          name: "Acme Water",
          createdAt: "2026-06-10T00:00:00.000Z",
          onboardingComplete: false,
        },
      ],
      smartRefillUsers: [
        {
          id: "user-1",
          data: {
            createdAt: "2026-06-12T00:00:00.000Z",
            appAccess: [{ appId: "smartrefill", role: "owner" }],
          },
        },
      ],
      businessOwnerIds: new Set(["user-1"]),
      limit: 5,
    });

    expect(result.salesReps[0]?.id).toBe("rep-new");
    expect(result.businesses[0]?.name).toBe("Acme Water");
    expect(result.platformUsers[0]?.role).toBe("owner");
  });

  it("counts every registration on the Asia/Manila day, past the list cap", () => {
    const result = buildNewJoiners({
      now: new Date("2026-10-19T00:30:00+08:00"),
      limit: 1,
      salesDocs: [
        {
          id: "today-1",
          data: () => ({
            displayName: "A",
            createdAt: "2026-10-18T16:00:00.000Z",
          }),
        },
        {
          id: "today-2",
          data: () => ({
            displayName: "B",
            createdAt: "2026-10-18T18:00:00.000Z",
          }),
        },
        {
          id: "yesterday",
          data: () => ({
            displayName: "C",
            createdAt: "2026-10-18T15:30:00.000Z",
          }),
        },
      ],
      recentBusinesses: [],
      smartRefillUsers: [
        { id: "u1", data: { createdAt: "2026-10-18T16:05:00.000Z" } },
        { id: "u2", data: { createdAt: "2026-10-18T20:00:00.000Z" } },
        { id: "u3", data: { createdAt: "2026-10-17T16:00:00.000Z" } },
      ],
      businessOwnerIds: new Set(),
    });

    expect(result.salesReps).toHaveLength(1);
    expect(result.platformUsers).toHaveLength(1);
    expect(result.registeredToday).toEqual({
      dayKey: "2026-10-19",
      smartrefill: 2,
      salesPortal: 2,
    });
  });
});
