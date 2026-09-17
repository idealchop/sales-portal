import { describe, expect, it } from "vitest";
import {
  buildSubscriptionReminderMailto,
  buildSubscriptionReminderSubject,
  buildSubscriptionReminderText,
} from "@/lib/email/subscription-reminder-template";

describe("subscription-reminder-template", () => {
  it("personalizes subject and body with business and expiry", () => {
    const input = {
      ownerName: "Jane Owner",
      businessName: "Aqua Station",
      planName: "Pro monthly",
      expiresLabel: "Sep 20, 2026",
    };
    expect(buildSubscriptionReminderSubject(input)).toContain("Jane");
    expect(buildSubscriptionReminderSubject(input)).toContain("Aqua Station");
    const text = buildSubscriptionReminderText(input);
    expect(text).toContain("Kumusta po, Jane!");
    expect(text).toContain("Aqua Station");
    expect(text).toContain("Pro monthly");
    expect(text).toContain("Sep 20, 2026");
    expect(text).toContain("renew");
  });

  it("builds mailto", () => {
    const href = buildSubscriptionReminderMailto("owner@example.com", {
      businessName: "Aqua",
    });
    expect(href.startsWith("mailto:owner@example.com?")).toBe(true);
  });
});
