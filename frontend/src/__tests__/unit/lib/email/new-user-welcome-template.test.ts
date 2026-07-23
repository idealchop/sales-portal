import { describe, expect, it } from "vitest";
import {
  NEW_USER_EMAIL_BCC,
  NEW_USER_EMAIL_FROM,
  buildNewUserWelcomeHtml,
  buildNewUserWelcomeMailto,
  buildNewUserWelcomeSubject,
  buildNewUserWelcomeText,
} from "@/lib/email/new-user-welcome-template";
import { OUTREACH_EMAIL_BCC } from "@/lib/email/outreach-email-shared";

describe("new-user-welcome-template", () => {
  it("personalizes subject and body with first name", () => {
    const input = { recipientName: "Maria Santos", businessName: "Aqua Station" };
    expect(buildNewUserWelcomeSubject(input)).toBe(
      "Kumusta po, Maria — paano na ang Smart Refill ninyo?",
    );
    const text = buildNewUserWelcomeText(input);
    expect(text).toContain("Hi Maria,");
    expect(text).toContain("Aqua Station");
    expect(text).toContain("mag-schedule");
    expect(text).toContain("regarding sa paggamit");
    expect(text).toContain("chat support");
    expect(text).toContain(NEW_USER_EMAIL_FROM);
  });

  it("builds html with demo CTA and support sender", () => {
    const html = buildNewUserWelcomeHtml({ recipientName: "Juan" });
    expect(html).toContain("Hi Juan,");
    expect(html).toContain("Mag-schedule ng demo");
    expect(html).toContain(NEW_USER_EMAIL_FROM);
    expect(html).toContain("River Support");
  });

  it("builds mailto with subject, body, and bcc", () => {
    const href = buildNewUserWelcomeMailto("user@example.com", {
      recipientName: "Ana",
    });
    expect(href.startsWith("mailto:user@example.com?")).toBe(true);
    expect(href).toContain("subject=");
    expect(href).toContain("body=");
    expect(decodeURIComponent(href)).toContain(NEW_USER_EMAIL_FROM);
    for (const address of OUTREACH_EMAIL_BCC) {
      expect(decodeURIComponent(href)).toContain(address);
    }
    expect(NEW_USER_EMAIL_BCC).toEqual(OUTREACH_EMAIL_BCC);
  });
});
