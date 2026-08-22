import { describe, expect, it } from "vitest";
import {
  mergeOutreachRecipient,
  type OutreachRecipient,
} from "../../../services/outreach-recipients-service";

describe("outreach-recipients-service", () => {
  it("merges duplicate emails and combines app badges", () => {
    const map = new Map<string, OutreachRecipient>();
    mergeOutreachRecipient(map, {
      id: "platform:uid-1",
      email: "ana@example.com",
      displayName: "Ana Owner",
      source: "platform_user",
      sourceLabel: "Platform user",
      apps: [{ appId: "smartrefill", label: "Smart Refill" }],
    });
    mergeOutreachRecipient(map, {
      id: "webinar:reg-1",
      email: "ana@example.com",
      displayName: "Ana",
      source: "webinar_guest",
      sourceLabel: "Webinar guest · Demo day",
      apps: [{ appId: "sales-portal", label: "Sales Portal" }],
    });

    expect(map.size).toBe(1);
    const merged = map.get("ana@example.com");
    expect(merged?.displayName).toBe("Ana Owner");
    expect(merged?.apps?.map((app) => app.appId).sort()).toEqual([
      "sales-portal",
      "smartrefill",
    ]);
    expect(merged?.sourceLabel).toContain("Platform user");
    expect(merged?.sourceLabel).toContain("Webinar guest");
  });

  it("skips invalid email addresses", () => {
    const map = new Map<string, OutreachRecipient>();
    mergeOutreachRecipient(map, {
      id: "client:1",
      email: "not-an-email",
      displayName: "Bad",
      source: "crm_client",
      sourceLabel: "CRM client / prospect",
    });
    expect(map.size).toBe(0);
  });
});
