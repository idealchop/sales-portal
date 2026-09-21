import { describe, expect, it } from "vitest";
import {
  LEAD_EMAIL_BLAST_DAILY_LIMIT,
  blastUsageDocId,
  personalizeLeadEmailText,
  utcDayKey,
} from "../../lib/lead-email-blast";

describe("lead-email-blast lib", () => {
  it("personalizes tokens", () => {
    expect(
      personalizeLeadEmailText("Kumusta {{ownerName}} — {{businessName}}", {
        ownerName: "Juan",
        businessName: "Station One",
      }),
    ).toBe("Kumusta Juan — Station One");
  });

  it("builds usage doc ids", () => {
    expect(blastUsageDocId("u1", "2026-09-22")).toBe("u1_2026-09-22");
    expect(utcDayKey(new Date("2026-09-22T08:00:00.000Z"))).toBe("2026-09-22");
    expect(LEAD_EMAIL_BLAST_DAILY_LIMIT).toBe(25);
  });
});
