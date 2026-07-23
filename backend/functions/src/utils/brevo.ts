import * as brevo from "@getbrevo/brevo";
import { logger } from "firebase-functions";

/**
 * Brevo API key for Sales Portal outreach.
 * Uses the shared SmartRefill Brevo secret on the same GCP project
 * (`SMARTREFILL_BREVO_API_KEY` in Secret Manager).
 */
function resolveBrevoApiKey(): string {
  const apiKey =
    process.env.SMARTREFILL_BREVO_API_KEY?.trim() ||
    process.env.SALES_PORTAL_BREVO_API_KEY?.trim();
  if (apiKey) return apiKey;

  if (process.env.FUNCTIONS_EMULATOR) {
    logger.warn(
      "Brevo (emulator): SMARTREFILL_BREVO_API_KEY missing — outreach emails will be skipped.",
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
