/**
 * Secret Manager ids bound on `salesPortalApi` + promotion delivery jobs
 * (see src/index.ts). Values are injected as env vars at runtime — never commit them.
 *
 * Separate from SmartRefill's `GEMINI_API_KEY` on the same GCP project.
 * Outreach email uses the shared Brevo key already provisioned for SmartRefill.
 */
export const SALES_PORTAL_FUNCTION_SECRETS = [
  "SALES_PORTAL_GEMINI_API_KEY",
  "SMARTREFILL_BREVO_API_KEY",
] as const;

/**
 * Extra secret for `salesPortalApiDev` only — dedicated “sales-portal” API key
 * so Cloud Monitoring credential_id splits Sales Dev from SmartRefill.
 */
export const SALES_PORTAL_DEV_FUNCTION_SECRETS = [
  ...SALES_PORTAL_FUNCTION_SECRETS,
  "SALES_PORTAL_GEMINI_API_KEY_DEV",
] as const;

export type SalesPortalFunctionSecret =
  (typeof SALES_PORTAL_FUNCTION_SECRETS)[number];
