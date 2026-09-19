import { describe, expect, it } from "vitest";
import {
  buildSignInHeatmap,
  loginDayCountsFromEvents,
  mondayOnOrBeforeUtc,
  signInHeatmapLevel,
  utcDayKey,
} from "@/lib/admin/sign-in-attendance-heatmap";

describe("sign-in attendance heatmap", () => {
  it("aligns weeks to Monday", () => {
    const sunday = new Date("2026-01-04T00:00:00.000Z");
    expect(utcDayKey(mondayOnOrBeforeUtc(sunday))).toBe("2025-12-29");
  });

  it("marks login days and keeps empty days at zero", () => {
    const counts = loginDayCountsFromEvents([
      { documentId: "2026-09-19", data: { calendarDayUtc: "2026-09-19" } },
      { documentId: "2026-01-02", data: { calendarDayUtc: "2026-01-02" } },
    ]);
    const model = buildSignInHeatmap(counts, 2026);
    expect(model.year).toBe(2026);
    expect(model.signedInDays).toBe(2);
    expect(model.monthLabels.map((row) => row.label)).toEqual([
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]);

    const signed = model.weeks.flatMap((week) => week.days).filter((cell) => cell.count > 0);
    expect(signed.map((cell) => cell.date).sort()).toEqual([
      "2026-01-02",
      "2026-09-19",
    ]);
    expect(signInHeatmapLevel(0)).toBe(0);
    expect(signInHeatmapLevel(1)).toBe(2);
  });

  it("falls back to the login_events document id when calendarDayUtc is missing", () => {
    const counts = loginDayCountsFromEvents([
      { documentId: "2026-03-04", data: {} },
    ]);
    expect(counts.get("2026-03-04")).toBe(1);
  });
});
