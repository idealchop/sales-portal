import { describe, expect, it } from "vitest";
import {
  aggregateStationCommunityAccepts,
  manilaPeriodKey,
} from "../../../services/community-channel-usage-service";

function mockBusinessDoc(
  id: string,
  data: Record<string, unknown>,
): { id: string; data: () => Record<string, unknown> } {
  return { id, data: () => data };
}

describe("manilaPeriodKey", () => {
  it("formats yyyy-MM in Asia/Manila", () => {
    const key = manilaPeriodKey(new Date("2026-06-15T12:00:00.000Z"));
    expect(key).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("aggregateStationCommunityAccepts", () => {
  const periodKey = "2026-06";

  it("sums accepts for matching period and counts enrolled stations", () => {
    const docs = [
      mockBusinessDoc("biz-a", {
        name: "Alpha WRS",
        communityDispatch: { enabled: true, publicName: "Alpha Water" },
        channelUsage: { periodKey, communityOrdersAccepted: 3 },
      }),
      mockBusinessDoc("biz-b", {
        name: "Beta WRS",
        communityDispatch: { enabled: true },
        channelUsage: { periodKey, communityOrdersAccepted: 1 },
      }),
      mockBusinessDoc("biz-c", {
        name: "Gamma WRS",
        communityDispatch: { enabled: false },
        channelUsage: { periodKey, communityOrdersAccepted: 5 },
      }),
      mockBusinessDoc("biz-d", {
        name: "Delta WRS",
        communityDispatch: { enabled: true },
        channelUsage: { periodKey: "2026-05", communityOrdersAccepted: 9 },
      }),
    ];

    const result = aggregateStationCommunityAccepts(docs as never, periodKey);

    expect(result.stationAcceptsTotal).toBe(4);
    expect(result.communityEnrolledStations).toBe(3);
    expect(result.stationsReportingAccepts).toBe(2);
    expect(result.topStationsByAccepts[0]).toEqual({
      businessId: "biz-a",
      businessName: "Alpha Water",
      accepts: 3,
    });
  });

  it("returns zeros when no businesses report usage", () => {
    const result = aggregateStationCommunityAccepts([], periodKey);
    expect(result.stationAcceptsTotal).toBe(0);
    expect(result.communityEnrolledStations).toBe(0);
    expect(result.topStationsByAccepts).toEqual([]);
  });
});
