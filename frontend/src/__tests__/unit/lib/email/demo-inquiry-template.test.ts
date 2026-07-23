import { describe, expect, it } from "vitest";
import {
  buildDemoInquiryHtml,
  buildDemoInquiryMailto,
  buildDemoInquirySubject,
  buildDemoInquiryText,
} from "@/lib/email/demo-inquiry-template";
import { OUTREACH_EMAIL_BCC, OUTREACH_EMAIL_FROM } from "@/lib/email/outreach-email-shared";
import { buildPlatformAlertOutreachMailto } from "@/lib/email/platform-alert-outreach";
import type { PlatformAlert } from "@/lib/dashboard/analytics";

describe("demo-inquiry-template", () => {
  it("personalizes subject and body", () => {
    const input = { recipientName: "Maria Santos", businessName: "Aqua Station" };
    expect(buildDemoInquirySubject(input)).toBe(
      "Kumusta po, Maria — tungkol sa Smart Refill demo ninyo",
    );
    const text = buildDemoInquiryText(input);
    expect(text).toContain("Hi Maria,");
    expect(text).toContain("Aqua Station");
    expect(text).toContain("demo inquiry");
    expect(text).toContain("chat support");
    expect(text).toContain(OUTREACH_EMAIL_FROM);
  });

  it("builds html with demo CTA", () => {
    const html = buildDemoInquiryHtml({ recipientName: "Juan" });
    expect(html).toContain("Hi Juan,");
    expect(html).toContain("Mag-schedule ng demo");
    expect(html).toContain("chat support");
  });

  it("builds mailto with bcc", () => {
    const href = buildDemoInquiryMailto("prospect@example.com", {
      recipientName: "Ana",
    });
    expect(href.startsWith("mailto:prospect@example.com?")).toBe(true);
    const decoded = decodeURIComponent(href);
    for (const address of OUTREACH_EMAIL_BCC) {
      expect(decoded).toContain(address);
    }
  });
});

describe("platform-alert-outreach", () => {
  it("builds demo and new-user mailtos", () => {
    const demo: PlatformAlert = {
      id: "demo-1",
      kind: "demo_inquiry",
      title: "Maria",
      subtitle: "Inquire for demo · Aqua",
      occurredAt: null,
      email: "maria@example.com",
      businessName: "Aqua",
    };
    const user: PlatformAlert = {
      id: "user-1",
      kind: "new_user_registration",
      title: "Juan",
      subtitle: "New user",
      occurredAt: null,
      email: "juan@example.com",
    };
    expect(buildPlatformAlertOutreachMailto(demo)).toContain("mailto:maria@example.com");
    expect(buildPlatformAlertOutreachMailto(user)).toContain("mailto:juan@example.com");
    expect(
      buildPlatformAlertOutreachMailto({
        ...demo,
        kind: "subscription_change",
        email: undefined,
      }),
    ).toBeNull();
    expect(
      buildPlatformAlertOutreachMailto({
        ...demo,
        kind: "subscription_change",
      }),
    ).toContain("mailto:maria@example.com");
  });
});
