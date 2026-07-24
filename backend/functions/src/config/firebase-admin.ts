import { loadLocalEnvIfNeeded } from "./load-local-env";
loadLocalEnvIfNeeded();

import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { buildFirebaseAdminInit } from "./firebase-admin-options";

let app: admin.app.App;
if (admin.apps.length === 0) {
  const { projectId, credentialMode, options } = buildFirebaseAdminInit();
  app = admin.initializeApp(options);
  logger.info("Firebase Admin initialized for Sales Portal API", {
    projectId: app.options.projectId ?? projectId,
    credentialMode,
    firestoreDatabaseId:
      process.env.SALES_PORTAL_FIRESTORE_DB || "riverdb",
  });
} else {
  app = admin.app();
}

const firestoreDatabaseId =
  process.env.SALES_PORTAL_FIRESTORE_DB || "riverdb";
export const db = getFirestore(app, firestoreDatabaseId);
db.settings({ ignoreUndefinedProperties: true });

/** Legacy SmartRefill production database (pre-riverdb). */
const legacyFirestoreDatabaseId =
  process.env.SALES_PORTAL_LEGACY_FIRESTORE_DB || "prod-smartrefill";
export const prodSmartrefillDb = getFirestore(app, legacyFirestoreDatabaseId);
prodSmartrefillDb.settings({ ignoreUndefinedProperties: true });

export const auth = admin.auth(app);
export const storage = admin.storage(app);
export { FieldValue, Timestamp } from "firebase-admin/firestore";
