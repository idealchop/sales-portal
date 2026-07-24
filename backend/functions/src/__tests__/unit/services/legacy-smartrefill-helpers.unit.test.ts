import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

// Lightweight pure helpers mirrored from the service for unit coverage.
function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? value : new Date(ms).toISOString();
  }
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return null;
}

function resolvePlanLabel(profile: Record<string, unknown>): string | null {
  const subscriptions = profile.subscriptions;
  if (Array.isArray(subscriptions) && subscriptions.length > 0) {
    const latest = subscriptions[subscriptions.length - 1] as Record<
      string,
      unknown
    >;
    const plan = String(latest.plan || "").trim();
    if (plan) return plan;
  }
  const priceId = String(profile.priceId || "").trim();
  if (!priceId) return null;
  if (priceId.includes("scale")) return "Scale";
  if (priceId.includes("starter") || priceId.includes("free")) return "Starter";
  if (priceId.includes("growth")) return "Growth";
  return priceId;
}

describe("legacy smartrefill helpers", () => {
  it("parses timestamp and ISO strings", () => {
    expect(toIso("2026-03-18T00:00:00.000Z")).toBe("2026-03-18T00:00:00.000Z");
    expect(toIso(Timestamp.fromDate(new Date("2026-01-01T00:00:00.000Z")))).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });

  it("resolves plan labels from subscriptions or priceId", () => {
    expect(
      resolvePlanLabel({
        subscriptions: [{ plan: "Scale", status: "expired" }],
      }),
    ).toBe("Scale");
    expect(resolvePlanLabel({ priceId: "price_scale_plan" })).toBe("Scale");
  });
});
