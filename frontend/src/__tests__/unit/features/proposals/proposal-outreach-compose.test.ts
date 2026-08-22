import { describe, expect, it } from "vitest";
import type { OutreachRecipient } from "@/lib/definitions";
import {
  buildOutreachTemplatePreview,
  MAX_BULK_OUTREACH_RECIPIENTS,
  summarizeBulkOutreachSend,
} from "@/features/proposals/lib/proposal-outreach-compose-utils";

const sampleRecipient: OutreachRecipient = {
  id: "platform:uid-1",
  email: "ana@example.com",
  displayName: "Ana Owner",
  companyName: "Ana WRS",
  source: "platform_user",
  sourceLabel: "Platform user",
  apps: [{ appId: "smartrefill", label: "Smart Refill" }],
};

describe("proposal-outreach-compose-utils", () => {
  it("builds demo inquiry preview with recipient name", () => {
    const preview = buildOutreachTemplatePreview(
      "demo_inquiry",
      sampleRecipient,
      "",
    );
    expect(preview.subject).toContain("Ana");
    expect(preview.bodyText).toContain("Ana WRS");
  });

  it("builds generic preview with follow-up topic", () => {
    const preview = buildOutreachTemplatePreview(
      "generic",
      sampleRecipient,
      "webinar follow-up",
    );
    expect(preview.bodyText).toContain("webinar follow-up");
  });

  it("summarizes bulk send results", () => {
    expect(
      summarizeBulkOutreachSend({
        total: 3,
        sent: 3,
        skipped: 0,
        failed: 0,
      }),
    ).toBe("Sent 3 emails via Brevo.");
    expect(
      summarizeBulkOutreachSend({
        total: 2,
        sent: 1,
        skipped: 0,
        failed: 1,
      }),
    ).toContain("failed 1");
  });

  it("caps bulk recipients at 50", () => {
    expect(MAX_BULK_OUTREACH_RECIPIENTS).toBe(50);
  });
});
