import { describe, expect, it } from "vitest";
import {
  LEAD_EMAIL_BLAST_DAILY_LIMIT,
  LEAD_EMAIL_TOKENS,
  leadsWithEmailCount,
  personalizeLeadEmailText,
  summarizeLeadEmailBlast,
} from "@/features/lead-pipeline/lib/lead-email-blast";

describe("lead email blast helpers", () => {
  it("personalizes tokens", () => {
    expect(
      personalizeLeadEmailText(
        "Hi {{firstName}} at {{businessName}} ({{email}}) · {{phone}} · {{stage}} · {{leadSource}} · {{nextFollowUpAt}}",
        {
          ownerName: "Ana Cruz",
          businessName: "Aqua Station",
          email: "ana@example.com",
          phone: "0917",
          stage: "warm",
          leadSource: "Website",
          nextFollowUpAt: "2026-09-30T01:00:00.000Z",
        },
      ),
    ).toMatch(/^Hi Ana at Aqua Station \(ana@example\.com\) · 0917 · Warm · Website · /);
  });

  it("exposes a documented token catalog", () => {
    expect(LEAD_EMAIL_TOKENS.map((row) => row.token)).toEqual([
      "{{firstName}}",
      "{{ownerName}}",
      "{{businessName}}",
      "{{email}}",
      "{{phone}}",
      "{{stage}}",
      "{{warmStatus}}",
      "{{leadSource}}",
      "{{referredBy}}",
      "{{nextFollowUpAt}}",
      "{{address}}",
    ]);
  });

  it("counts leads with email", () => {
    expect(
      leadsWithEmailCount([
        { email: "a@x.com" },
        { email: "" },
        { email: "not-an-email" },
        { email: "b@y.com" },
      ]),
    ).toBe(2);
  });

  it("summarizes blast results", () => {
    expect(
      summarizeLeadEmailBlast({
        sent: 3,
        skipped: 1,
        failed: 0,
        attemptLogged: 3,
        remaining: 22,
      }),
    ).toContain(`22 of ${LEAD_EMAIL_BLAST_DAILY_LIMIT} remaining`);
  });
});
