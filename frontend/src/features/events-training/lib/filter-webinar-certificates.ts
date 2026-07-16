import type { WebinarRecord, WebinarStatus } from "./events-training-types";

export const WEBINAR_CERT_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export type WebinarCertPageSize = (typeof WEBINAR_CERT_PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_WEBINAR_CERT_PAGE_SIZE: WebinarCertPageSize = 10;

export type WebinarCertStatusFilter = "all" | WebinarStatus;
export type WebinarCertAppFilter = "all" | string;
export type WebinarCertIssuedFilter = "all" | "issued" | "none";

export function filterEnabledWebinarCertificates(input: {
  items: WebinarRecord[];
  search: string;
  status: WebinarCertStatusFilter;
  appId: WebinarCertAppFilter;
  issued: WebinarCertIssuedFilter;
  issuedCountByWebinar: Map<string, number>;
}): WebinarRecord[] {
  const q = input.search.trim().toLowerCase();
  return input.items.filter((webinar) => {
    if (input.status !== "all" && webinar.status !== input.status) return false;
    if (input.appId !== "all") {
      const app = (webinar.appId ?? "").trim() || "smartrefill";
      if (app !== input.appId) return false;
    }
    const issuedCount = input.issuedCountByWebinar.get(webinar.id) ?? 0;
    if (input.issued === "issued" && issuedCount === 0) return false;
    if (input.issued === "none" && issuedCount > 0) return false;
    if (!q) return true;
    const haystack = [
      webinar.name,
      webinar.speaker,
      webinar.host,
      webinar.appId,
      webinar.status,
      ...(webinar.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
