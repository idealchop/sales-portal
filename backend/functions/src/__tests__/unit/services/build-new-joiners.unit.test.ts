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
});
