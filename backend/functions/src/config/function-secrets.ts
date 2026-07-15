/**
 * Secret Manager ids bound on `salesPortalApi` + promotion delivery jobs
 * (see src/index.ts). Values are injected as env vars at runtime — never commit them.
 *
 * Meta Page secrets are shared with SmartRefill (`META_COMMUNITY_*` on the same
 * GCP project). Separate from SmartRefill's `GEMINI_API_KEY`.
 */
export const SALES_PORTAL_FUNCTION_SECRETS = [
  "SALES_PORTAL_GEMINI_API_KEY",
  "META_COMMUNITY_PAGE_ACCESS_TOKEN",
  "META_COMMUNITY_PAGE_ID",
] as const;

export type SalesPortalFunctionSecret =
  (typeof SALES_PORTAL_FUNCTION_SECRETS)[number];
