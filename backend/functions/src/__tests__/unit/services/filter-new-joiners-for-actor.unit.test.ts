import { beforeEach, describe, expect, it, vi } from "vitest";
import { filterNewJoinersForActor } from "../../../services/filter-new-joiners-for-actor";
import type { NewJoinersSummary } from "../../../services/build-new-joiners";

const { getManagerTeamKeyMock } = vi.hoisted(() => ({
  getManagerTeamKeyMock: vi.fn(),
}));

vi.mock("../../../services/sales-scope", () => ({
  getManagerTeamKey: getManagerTeamKeyMock,
}));

const sample: NewJoinersSummary = {
  salesReps: [
    {
      id: "rep-a",
      displayName: "Rep A",
      team: "north",
      onboardingComplete: true,
      joinedAt: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "rep-b",
      displayName: "Rep B",
      team: "south",
      onboardingComplete: false,
      joinedAt: "2026-06-02T00:00:00.000Z",
    },
  ],
  businesses: [
    {
      id: "biz-1",
      name: "Acme",
      onboardingComplete: true,
      joinedAt: "2026-06-01T00:00:00.000Z",
    },
  ],
  platformUsers: [
    {
      id: "user-1",
      displayName: "Owner",
      role: "owner",
      joinedAt: "2026-06-03T00:00:00.000Z",
    },
  ],
};

describe("filterNewJoinersForActor", () => {
  beforeEach(() => {
    getManagerTeamKeyMock.mockReset();
  });

  it("returns all joiners for admin", async () => {
    const result = await filterNewJoinersForActor(sample, {
      uid: "admin-1",
      role: "admin",
    });

    expect(result).toEqual(sample);
  });

  it("filters sales reps to manager team", async () => {
    getManagerTeamKeyMock.mockResolvedValue("north");

    const result = await filterNewJoinersForActor(sample, {
      uid: "mgr-1",
      role: "manager",
    });

    expect(result.salesReps.map((rep) => rep.id)).toEqual(["rep-a"]);
    expect(result.businesses).toEqual(sample.businesses);
    expect(result.platformUsers).toEqual(sample.platformUsers);
  });

  it("hides sales reps for sales role", async () => {
    const result = await filterNewJoinersForActor(sample, {
      uid: "sales-1",
      role: "sales",
    });

    expect(result.salesReps).toEqual([]);
    expect(result.businesses).toEqual(sample.businesses);
    expect(result.platformUsers).toEqual(sample.platformUsers);
  });
});
