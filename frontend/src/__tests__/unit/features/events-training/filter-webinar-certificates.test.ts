import { describe, expect, it } from "vitest";
import { filterEnabledWebinarCertificates } from "@/features/events-training/lib/filter-webinar-certificates";
import type { WebinarRecord } from "@/features/events-training/lib/events-training-types";

function webinar(
  partial: Partial<WebinarRecord> & Pick<WebinarRecord, "id" | "name">,
): WebinarRecord {
  return {
    description: "",
    tags: [],
    speaker: "",
    host: "",
    startsAt: null,
    endsAt: null,
    timezone: "Asia/Manila",
    posterUrl: null,
    status: "published",
    visibility: "public",
    priceCents: 0,
    currency: "PHP",
    allowedPlanCodes: [],
    allowAllMembers: true,
    capacity: null,
    registrationCount: 0,
    joinLink: null,
    linkedVideoId: null,
    certificationEnabled: true,
    archivedAt: null,
    ...partial,
  };
}

describe("filterEnabledWebinarCertificates", () => {
  const items = [
    webinar({
      id: "a",
      name: "Coco Mama",
      speaker: "Maya",
      status: "published",
      appId: "smartrefill",
    }),
    webinar({
      id: "b",
      name: "Ops Clinic",
      speaker: "Jordan",
      status: "completed",
      appId: "sales-portal",
    }),
  ];

  it("filters by search, status, app, and issued count", () => {
    const issued = new Map<string, number>([
      ["a", 2],
      ["b", 0],
    ]);

    expect(
      filterEnabledWebinarCertificates({
        items,
        search: "coco",
        status: "all",
        appId: "all",
        issued: "all",
        issuedCountByWebinar: issued,
      }).map((w) => w.id),
    ).toEqual(["a"]);

    expect(
      filterEnabledWebinarCertificates({
        items,
        search: "",
        status: "completed",
        appId: "all",
        issued: "all",
        issuedCountByWebinar: issued,
      }).map((w) => w.id),
    ).toEqual(["b"]);

    expect(
      filterEnabledWebinarCertificates({
        items,
        search: "",
        status: "all",
        appId: "sales-portal",
        issued: "none",
        issuedCountByWebinar: issued,
      }).map((w) => w.id),
    ).toEqual(["b"]);

    expect(
      filterEnabledWebinarCertificates({
        items,
        search: "",
        status: "all",
        appId: "all",
        issued: "issued",
        issuedCountByWebinar: issued,
      }).map((w) => w.id),
    ).toEqual(["a"]);
  });
});
