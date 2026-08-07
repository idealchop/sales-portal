/**
 * Deployed Dev tier (same Firebase project, riverdb-dev).
 * Detected from Cloud Function name (`*Dev`) — do not set SALES_PORTAL_ENV_DEV on these.
 *
 * Legacy SmartRefill analytics always use prod-smartrefill (both Dev and Prod tiers).
 */

export const DEV_APP_ORIGIN =
  "https://dev-sales-portal--aquaflow-management-suite.asia-southeast1.hosted.app";

export const DEV_API_URL =
  "https://asia-southeast1-aquaflow-management-suite.cloudfunctions.net/salesPortalApiDev";

export const DEV_SMARTREFILL_API_URL =
  "https://asia-southeast1-aquaflow-management-suite.cloudfunctions.net/smartrefillV3ApiDev";

const PROD_API_URL =
  "https://asia-southeast1-aquaflow-management-suite.cloudfunctions.net/salesPortalApi";

const PROD_SMARTREFILL_API_URL =
  "https://asia-southeast1-aquaflow-management-suite.cloudfunctions.net/smartrefillV3Api";

function cloudFunctionName(): string {
  return (
    process.env.K_SERVICE?.trim() ||
    process.env.FUNCTION_TARGET?.trim() ||
    ""
  );
}

/**
 * True when this Cloud Run / Functions instance is a *Dev export.
 *
 * Hosted services: only the function name (`*Dev`) decides the tier so a
 * leaked local `.env` (`SALES_PORTAL_DEPLOY_TIER=dev`) cannot flip Prod
 * `salesPortalApi` onto `riverdb-dev`.
 * Local / emulator: `SALES_PORTAL_DEPLOY_TIER=dev` is allowed.
 */
export function isSalesPortalDeployedDevTier(): boolean {
  const name = cloudFunctionName();
  if (/Dev$/.test(name)) return true;
  if (name) return false;
  return (
    String(process.env.SALES_PORTAL_DEPLOY_TIER || "")
      .trim()
      .toLowerCase() === "dev"
  );
}

/**
 * Primary Firestore database for this instance.
 * *Dev Cloud Functions always use riverdb-dev.
 * Hosted Prod exports always use riverdb (ignore leaked dotenv riverdb-dev).
 * Local: SALES_PORTAL_FIRESTORE_DB wins, then riverdb.
 */
export function resolveFirestoreDatabaseId(): string {
  if (isSalesPortalDeployedDevTier()) {
    return "riverdb-dev";
  }
  if (cloudFunctionName()) {
    return "riverdb";
  }
  const fromEnv = process.env.SALES_PORTAL_FIRESTORE_DB?.trim();
  if (fromEnv) return fromEnv;
  return "riverdb";
}

/**
 * Legacy SmartRefill DB — always prod-smartrefill unless explicitly overridden.
 * Hosted Dev still reads legacy ops from prod-smartrefill (not riverdb-dev).
 */
export function resolveLegacyFirestoreDatabaseId(): string {
  const fromEnv = process.env.SALES_PORTAL_LEGACY_FIRESTORE_DB?.trim();
  if (fromEnv) return fromEnv;
  return "prod-smartrefill";
}

export function resolvePublicApiBaseUrl(): string {
  const fromEnv = process.env.PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv;
  return isSalesPortalDeployedDevTier() ? DEV_API_URL : PROD_API_URL;
}

/**
 * SmartRefill V3 proxy target.
 * Deployed Dev always uses smartrefillV3ApiDev.
 * Hosted Prod always uses smartrefillV3Api (ignore leaked *ApiDev dotenv).
 */
export function resolveSmartrefillApiBaseUrl(): string {
  if (isSalesPortalDeployedDevTier()) {
    return DEV_SMARTREFILL_API_URL;
  }
  if (cloudFunctionName()) {
    return PROD_SMARTREFILL_API_URL;
  }
  const fromEnv = process.env.SMARTREFILL_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.FUNCTIONS_EMULATOR) {
    return "http://127.0.0.1:5001/aquaflow-management-suite/asia-southeast1/smartrefillV3Api";
  }
  return PROD_SMARTREFILL_API_URL;
}

/**
 * Dev schedulers run unless explicitly disabled.
 * Pause: set SALES_PORTAL_DEV_JOBS_ENABLED=false on the Cloud Run service.
 */
export function isDevJobsEnabled(): boolean {
  const raw = process.env.SALES_PORTAL_DEV_JOBS_ENABLED;
  if (raw !== undefined && raw !== "") {
    const s = String(raw).trim().toLowerCase();
    if (s === "false" || s === "0" || s === "no") return false;
    if (s === "true" || s === "1" || s === "yes") return true;
  }
  return isSalesPortalDeployedDevTier();
}
