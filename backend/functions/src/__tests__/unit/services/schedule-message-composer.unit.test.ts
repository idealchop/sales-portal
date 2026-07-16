import { describe, expect, it } from "vitest";
import {
  buildWebinarRegisterUrl,
  composeWebinarScheduleMessage,
  seatsRemainingForWebinar,
} from "../../../services/events-training/schedule-message-composer";

describe("schedule-message-composer", () => {
  it("includes register link, seats left, and certificate for new webinars", () => {
    const msg = composeWebinarScheduleMessage({
      purpose: "new_webinar",
      webinar: {
        id: "evt-1",
        name: "Coco Mama the musical",
        speaker: "Maya",
        startsAt: "2026-07-20T02:00:00.000Z",
        timezone: "Asia/Manila",
        capacity: 100,
        registrationCount: 73,
        certificationEnabled: true,
        posterUrl: "https://example.com/poster.jpg",
        description: "Learn station ops through musical storytelling.",
      },
    });

    expect(msg.subject).toContain("Coco Mama");
    expect(msg.registerUrl).toContain("/webinars");
    expect(msg.registerUrl).toContain("event=evt-1");
    expect(msg.seatsRemaining).toBe(27);
    expect(msg.emailBody).toContain("Seats left: 27 of 100");
    expect(msg.emailBody).toContain("Certificate: yes");
    expect(msg.metaCaption).toContain("Register / join in Smart Refill");
    expect(msg.emailTemplateKey).toBe("webinar-new-invite");
  });

  it("computes seats and register URLs", () => {
    expect(seatsRemainingForWebinar({ capacity: 10, registrationCount: 3 })).toBe(
      7,
    );
    expect(seatsRemainingForWebinar({ capacity: null })).toBeNull();
    expect(buildWebinarRegisterUrl("abc")).toContain("event=abc");
  });
});
