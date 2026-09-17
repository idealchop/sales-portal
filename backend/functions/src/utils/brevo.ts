import * as brevo from "@getbrevo/brevo";
import { logger } from "firebase-functions";

function isCloudFunctionsRuntime(): boolean {
  return Boolean(process.env.K_SERVICE || process.env.FUNCTION_TARGET);
}

/**
 * Brevo API key for Sales Portal outreach.
 * Uses the shared SmartRefill Brevo secret on the same GCP project
 * (`SMARTREFILL_BREVO_API_KEY` in Secret Manager).
 *
 * Local `serve:local` does not bind Secret Manager — put the key in
 * `backend/functions/.env` or `.env.local`, or Send via Brevo will be skipped.
 */
function resolveBrevoApiKey(): string {
  const apiKey =
    process.env.SMARTREFILL_BREVO_API_KEY?.trim() ||
    process.env.SALES_PORTAL_BREVO_API_KEY?.trim();
  if (apiKey) return apiKey;

  const localOrEmulator =
    process.env.FUNCTIONS_EMULATOR || !isCloudFunctionsRuntime();
  if (localOrEmulator) {
    logger.warn(
      "Brevo (local): SMARTREFILL_BREVO_API_KEY missing — outreach emails will be skipped. Add it to backend/functions/.env or .env.local.",
    );
    return "";
  }

  logger.error(
    "Brevo (production): SMARTREFILL_BREVO_API_KEY missing. Bind it on salesPortalApi secrets.",
  );
  throw new Error("Brevo API key not configured");
}

export function getBrevoApi(): brevo.TransactionalEmailsApi | null {
  const apiKey = resolveBrevoApiKey();
  if (!apiKey) return null;

  const api = new brevo.TransactionalEmailsApi();
  api.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
  return api;
}

export { brevo };
