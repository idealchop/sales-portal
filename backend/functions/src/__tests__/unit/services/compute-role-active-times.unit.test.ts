import { describe, expect, it } from "vitest";
import {
  createRoleActiveTimeBuckets,
  formatMinutesOfDay,
  minutesOfDayInTimezone,
  recordRoleActiveTime,
  summarizeRoleActiveTimes,
} from "../../../services/compute-role-active-times";

describe("computeRoleActiveTimes", () => {
  it("averages login times with circular mean per role", () => {
    const buckets = createRoleActiveTimeBuckets();

    recordRoleActiveTime(buckets, "owner", 9 * 60);
    recordRoleActiveTime(buckets, "owner", 9 * 60 + 30);
    recordRoleActiveTime(buckets, "admin", 14 * 60);
    recordRoleActiveTime(buckets, "rider", 7 * 60 + 45);

    const summary = summarizeRoleActiveTimes(buckets);

    expect(summary.owners).toBe("9:15 AM");
    expect(summary.admins).toBe("2:00 PM");
    expect(summary.riders).toBe("7:45 AM");
    expect(summary.sampleCounts).toEqual({ owners: 2, admins: 1, riders: 1 });
  });

  it("converts timestamps to minutes in Asia/Manila", () => {
    const minutes = minutesOfDayInTimezone(
      new Date("2026-06-12T01:30:00.000Z"),
      "Asia/Manila",
    );

    expect(minutes).toBe(9 * 60 + 30);
    expect(formatMinutesOfDay(minutes)).toBe("9:30 AM");
  });
});
