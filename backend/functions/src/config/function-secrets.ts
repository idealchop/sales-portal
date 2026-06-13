/**
 * Secret Manager ids bound on `salesPortalApi` (see src/index.ts).
 * Values are injected as env vars at runtime on Cloud Functions — never commit them.
 *
 * Separate from SmartRefill's `GEMINI_API_KEY` on the same GCP project.
 */
export const SALES_PORTAL_FUNCTION_SECRETS = [
  "SALES_PORTAL_GEMINI_API_KEY",
] as const;

export type SalesPortalFunctionSecret =
  (typeof SALES_PORTAL_FUNCTION_SECRETS)[number];
