import { describe, expect, it } from "vitest";
import {
  buildInactiveOwnerHtml,
  buildInactiveOwnerMailto,
  buildInactiveOwnerSubject,
  buildInactiveOwnerText,
} from "@/lib/email/inactive-owner-template";
import {
  OUTREACH_EMAIL_BCC,
  OUTREACH_EMAIL_FROM,
} from "@/lib/email/outreach-email-shared";

describe("inactive-owner-template", () => {
  it("personalizes subject and body with business name", () => {
    const input = { businessName: "Aqua Clear Station" };
    expect(buildInactiveOwnerSubject(input)).toBe(
      "Kumusta po, Aqua Clear Station — namimiss namin kayo sa Smart Refill",
    );
    const text = buildInactiveOwnerText(input);
    expect(text).toContain("Hi Aqua Clear Station,");
    expect(text).toContain("Namimiss po namin kayo");
    expect(text).toContain("Aqua Clear Station");
    expect(text).toContain("chat support");
    expect(text).toContain("continue using Smart Refill");
    expect(text).toContain(OUTREACH_EMAIL_FROM);
  });

  it("builds html with chat support CTA", () => {
    const html = buildInactiveOwnerHtml({ businessName: "Pureflow" });
    expect(html).toContain("Hi Pureflow,");
    expect(html).toContain("chat support");
    expect(html).toContain("Contact support");
  });

  it("builds mailto with bcc", () => {
    const href = buildInactiveOwnerMailto("owner@example.com", {
      businessName: "Aqua",
    });
    expect(href.startsWith("mailto:owner@example.com?")).toBe(true);
    const decoded = decodeURIComponent(href);
    expect(decoded).toContain(OUTREACH_EMAIL_FROM);
    for (const address of OUTREACH_EMAIL_BCC) {
      expect(decoded).toContain(address);
    }
  });
});
