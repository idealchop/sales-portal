import { describe, expect, it } from "vitest";
import {
  OUTREACH_EMAIL_BCC,
  OUTREACH_SENDER,
} from "../../../services/outreach/outreach-constants";
import { buildOutreachEmailByKind } from "../../../services/outreach/outreach-templates";

describe("buildOutreachEmailByKind", () => {
  it("builds new-user welcome with support sender identity in body", () => {
    const email = buildOutreachEmailByKind("new_user_registration", {
      recipientName: "Juan Dela Cruz",
      businessName: "Aqua Station",
    });
    expect(email.subject).toContain("Juan");
    expect(email.html).toContain("Aqua Station");
    expect(email.text).toContain(OUTREACH_SENDER.email);
    expect(email.brevoTag).toBe("sales_portal_new_user_welcome");
  });

  it("builds demo inquiry outreach", () => {
    const email = buildOutreachEmailByKind("demo_inquiry", {
      recipientName: "Maria",
    });
    expect(email.subject.toLowerCase()).toContain("demo");
    expect(email.brevoTag).toBe("sales_portal_demo_inquiry");
  });

  it("builds inactive-owner miss-you outreach", () => {
    const email = buildOutreachEmailByKind("inactive_owner", {
      businessName: "Laguna Refill",
    });
    expect(email.html).toContain("Laguna Refill");
    expect(email.brevoTag).toBe("sales_portal_inactive_owner");
  });

  it("falls back to generic follow-up", () => {
    const email = buildOutreachEmailByKind("generic", {
      subtitle: "subscription expiring soon",
    });
    expect(email.html).toContain("subscription expiring soon");
    expect(email.brevoTag).toBe("sales_portal_alert_followup");
  });
});

describe("outreach constants", () => {
  it("sends from support@riverph.com with expected BCC list", () => {
    expect(OUTREACH_SENDER.email).toBe("support@riverph.com");
    expect(OUTREACH_EMAIL_BCC).toEqual([
      "justfer@riverph.com",
      "wina@riverph.com",
      "jimboy@smartrefill.io",
    ]);
  });
});
