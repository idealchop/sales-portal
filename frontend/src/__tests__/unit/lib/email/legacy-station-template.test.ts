import { describe, expect, it } from "vitest";
import {
  buildLegacyStationHtml,
  buildLegacyStationMailto,
  buildLegacyStationSubject,
  buildLegacyStationText,
} from "@/lib/email/legacy-station-template";
import {
  OUTREACH_EMAIL_BCC,
  OUTREACH_EMAIL_FROM,
} from "@/lib/email/outreach-email-shared";

describe("legacy-station-template", () => {
  it("personalizes subject and body with owner + business", () => {
    const input = {
      recipientName: "Juan Dela Cruz",
      businessName: "Aqua Clear Station",
    };
    expect(buildLegacyStationSubject(input)).toBe(
      "Kumusta po, Juan — update tungkol sa Smart Refill station ninyo",
    );
    const text = buildLegacyStationText(input);
    expect(text).toContain("Hi Juan,");
    expect(text).toContain("Aqua Clear Station");
    expect(text).toContain("dating Smart Refill system");
    expect(text).toContain("mag-upgrade");
    expect(text).toContain("chat support sa smartrefill.io");
    expect(text).toContain(
      "Para mag-schedule, pwede po kayong mag-reply sa email na ito, or email kami sa support@riverph.com.",
    );
    expect(text).not.toContain("preferred date and time");
    expect(text).toContain(OUTREACH_EMAIL_FROM);
  });

  it("falls back to business name in greeting when owner missing", () => {
    expect(
      buildLegacyStationSubject({ businessName: "Laguna Refill" }),
    ).toContain("Laguna Refill");
    expect(buildLegacyStationText({ businessName: "Laguna Refill" })).toContain(
      "Hi Laguna Refill,",
    );
  });

  it("builds html with reply CTA and chat support", () => {
    const html = buildLegacyStationHtml({ businessName: "Pureflow" });
    expect(html).toContain("Hi Pureflow,");
    expect(html).toContain("Station check-in");
    expect(html).toContain("Mag-reply sa support");
    expect(html).toContain("chat support sa smartrefill.io");
    expect(html).toContain("Pureflow");
  });

  it("builds mailto with bcc", () => {
    const href = buildLegacyStationMailto("owner@example.com", {
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
