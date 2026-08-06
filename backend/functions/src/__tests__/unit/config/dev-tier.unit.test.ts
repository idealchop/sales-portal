import { afterEach, describe, expect, it } from "vitest";
import {
  isDevJobsEnabled,
  isSalesPortalDeployedDevTier,
  resolveFirestoreDatabaseId,
  resolveLegacyFirestoreDatabaseId,
  resolveSmartrefillApiBaseUrl,
} from "../../../config/dev-tier";

const ORIGINAL = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL);
  delete process.env.K_SERVICE;
  delete process.env.FUNCTION_TARGET;
  delete process.env.SALES_PORTAL_DEPLOY_TIER;
  delete process.env.SALES_PORTAL_FIRESTORE_DB;
  delete process.env.SALES_PORTAL_LEGACY_FIRESTORE_DB;
  delete process.env.SALES_PORTAL_DEV_JOBS_ENABLED;
  delete process.env.SMARTREFILL_API_URL;
  delete process.env.FUNCTIONS_EMULATOR;
});

describe("dev-tier", () => {
  it("detects Dev tier from function name ending in Dev", () => {
    process.env.K_SERVICE = "salesPortalApiDev";
    expect(isSalesPortalDeployedDevTier()).toBe(true);
    expect(resolveFirestoreDatabaseId()).toBe("riverdb-dev");
    expect(resolveSmartrefillApiBaseUrl()).toContain("smartrefillV3ApiDev");
  });

  it("detects Dev tier from SALES_PORTAL_DEPLOY_TIER=dev", () => {
    process.env.SALES_PORTAL_DEPLOY_TIER = "dev";
    expect(isSalesPortalDeployedDevTier()).toBe(true);
    expect(resolveFirestoreDatabaseId()).toBe("riverdb-dev");
  });

  it("uses riverdb for Prod and ignores Dev URLs", () => {
    process.env.K_SERVICE = "salesPortalApi";
    process.env.SALES_PORTAL_FIRESTORE_DB = "riverdb";
    expect(isSalesPortalDeployedDevTier()).toBe(false);
    expect(resolveFirestoreDatabaseId()).toBe("riverdb");
    expect(resolveSmartrefillApiBaseUrl()).toContain("smartrefillV3Api");
    expect(resolveSmartrefillApiBaseUrl()).not.toContain("Dev");
  });

  it("keeps legacy analytics on prod-smartrefill for Dev and Prod", () => {
    process.env.K_SERVICE = "salesPortalApiDev";
    expect(resolveLegacyFirestoreDatabaseId()).toBe("prod-smartrefill");

    process.env.K_SERVICE = "salesPortalApi";
    expect(resolveLegacyFirestoreDatabaseId()).toBe("prod-smartrefill");
  });

  it("allows explicit legacy DB override", () => {
    process.env.SALES_PORTAL_LEGACY_FIRESTORE_DB = "custom-legacy";
    expect(resolveLegacyFirestoreDatabaseId()).toBe("custom-legacy");
  });

  it("gates Dev jobs via SALES_PORTAL_DEV_JOBS_ENABLED", () => {
    process.env.K_SERVICE = "eventsTrainingPromotionDeliveryDev";
    expect(isDevJobsEnabled()).toBe(true);

    process.env.SALES_PORTAL_DEV_JOBS_ENABLED = "false";
    expect(isDevJobsEnabled()).toBe(false);
  });
});
