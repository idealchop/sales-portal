import { describe, expect, it } from "vitest";
import {
  buildLeadFollowUpMailto,
  buildLeadFollowUpSubject,
  buildLeadFollowUpText,
} from "@/lib/email/lead-follow-up-template";
import { OUTREACH_EMAIL_BCC } from "@/lib/email/outreach-email-shared";

describe("lead follow-up email", () => {
  it("builds subject with business name", () => {
    expect(
      buildLeadFollowUpSubject({ businessName: "Aqua Station" }),
    ).toBe("Follow-up — Aqua Station · Smart Refill");
  });

  it("greets by owner first name", () => {
    const body = buildLeadFollowUpText({
      ownerName: "Juan Dela Cruz",
      businessName: "Aqua Station",
    });
    expect(body).toContain("Kumusta po, Juan!");
    expect(body).toContain("Aqua Station");
  });

  it("builds mailto with bcc", () => {
    const href = buildLeadFollowUpMailto("owner@example.com", {
      ownerName: "Juan",
      businessName: "Refill Co",
    });
    expect(href.startsWith("mailto:owner@example.com?")).toBe(true);
    expect(href).toContain(
      `bcc=${OUTREACH_EMAIL_BCC.map(encodeURIComponent).join(",")}`,
    );
  });
});
