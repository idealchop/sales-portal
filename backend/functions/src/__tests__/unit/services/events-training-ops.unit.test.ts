import {
  canAcceptGivenCapacity,
  canTransitionRegistration,
} from "../../../services/events-training/registrations-service";
import {
  buildUtcDayKeys,
  clampPeriodDays,
  isoToUtcDayKey,
  rankContentByCount,
} from "../../../services/events-training/analytics-service";

describe("events-training registrations helpers", () => {
  it("allows accept when capacity is unlimited", () => {
    expect(canAcceptGivenCapacity(100, null)).toBe(true);
    expect(canAcceptGivenCapacity(100, undefined)).toBe(true);
  });

  it("blocks accept when at capacity", () => {
    expect(canAcceptGivenCapacity(10, 10)).toBe(false);
    expect(canAcceptGivenCapacity(9, 10)).toBe(true);
  });

  it("allows pending → accepted/declined/cancelled", () => {
    expect(canTransitionRegistration("pending", "accepted")).toBe(true);
    expect(canTransitionRegistration("pending", "declined")).toBe(true);
    expect(canTransitionRegistration("pending", "cancelled")).toBe(true);
  });

  it("blocks transitions from declined/cancelled", () => {
    expect(canTransitionRegistration("declined", "accepted")).toBe(false);
    expect(canTransitionRegistration("cancelled", "pending")).toBe(false);
  });
});

describe("events-training analytics helpers", () => {
  it("clamps period days to 1–90", () => {
    expect(clampPeriodDays(0)).toBe(1);
    expect(clampPeriodDays(30)).toBe(30);
    expect(clampPeriodDays(120)).toBe(90);
    expect(clampPeriodDays("abc")).toBe(30);
  });

  it("builds contiguous UTC day keys", () => {
    const keys = buildUtcDayKeys(3, new Date("2026-07-15T12:00:00.000Z"));
    expect(keys).toEqual(["2026-07-13", "2026-07-14", "2026-07-15"]);
  });

  it("maps ISO timestamps to UTC day keys", () => {
    expect(isoToUtcDayKey("2026-07-15T01:30:00.000Z")).toBe("2026-07-15");
    expect(isoToUtcDayKey(null)).toBeNull();
  });

  it("ranks content by count with category labels", () => {
    expect(
      rankContentByCount(
        [
          { key: "a", label: "Alpha", count: 2, category: "Story" },
          { key: "b", label: "Beta", count: 10, category: "Tutorial" },
          { key: "c", label: "Zero", count: 0, category: "Recording" },
        ],
        2,
      ),
    ).toEqual([
      { key: "b", label: "Beta", count: 10, category: "Tutorial" },
      { key: "a", label: "Alpha", count: 2, category: "Story" },
    ]);
  });
});
