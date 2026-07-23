import { describe, expect, it } from "vitest";
import {
  OUTREACH_EMAIL_BCC,
  OUTREACH_EMAIL_FROM,
  buildOutreachMailto,
} from "@/lib/email/outreach-email-shared";
import { buildPlatformAlertOutreachMailto } from "@/lib/email/platform-alert-outreach";
import type { PlatformAlert } from "@/lib/dashboard/analytics";

describe("buildOutreachMailto", () => {
  it("keeps raw commas between BCC addresses", () => {
    const href = buildOutreachMailto({
      toEmail: "owner@example.com",
      subject: "Hello",
      body: "Body",
    });
    expect(href).toContain(
      `bcc=${OUTREACH_EMAIL_BCC.map(encodeURIComponent).join(",")}`,
    );
    expect(href).not.toMatch(/bcc=[^&]*%2C/);
    expect(href).toContain(encodeURIComponent(OUTREACH_EMAIL_FROM));
  });
});

describe("buildPlatformAlertOutreachMailto", () => {
  it("builds demo and new-user mailtos with email", () => {
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
    expect(buildPlatformAlertOutreachMailto(demo)).toContain(
      "mailto:maria@example.com",
    );
    expect(buildPlatformAlertOutreachMailto(user)).toContain(
      "mailto:juan@example.com",
    );
  });

  it("returns null when alert has no email", () => {
    expect(
      buildPlatformAlertOutreachMailto({
        id: "sub-1",
        kind: "subscription_change",
        title: "Biz",
        subtitle: "Upgraded",
        occurredAt: null,
      }),
    ).toBeNull();
  });

  it("falls back to generic mailto for other kinds with email", () => {
    const href = buildPlatformAlertOutreachMailto({
      id: "sub-1",
      kind: "subscription_expiring_soon",
      title: "Biz Owner",
      subtitle: "Expires soon · Scale",
      occurredAt: null,
      email: "owner@example.com",
    });
    expect(href).toContain("mailto:owner@example.com");
    expect(href).toContain("bcc=");
  });
});
