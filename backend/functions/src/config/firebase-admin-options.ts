import * as admin from "firebase-admin";

const PROJECT_ID =
  process.env.SALES_PORTAL_FIREBASE_PROJECT_ID || "aquaflow-management-suite";

export type FirebaseAdminCredentialMode =
  | "emulator"
  | "service-account"
  | "application-default";

function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/\\n/g, "\n");
}

export function buildFirebaseAdminInit(): {
  projectId: string;
  credentialMode: FirebaseAdminCredentialMode;
  options: admin.AppOptions;
  } {
  const storageBucket = process.env.SALES_PORTAL_FIREBASE_STORAGE_BUCKET;
  const credentialMode = process.env.FUNCTIONS_EMULATOR ?
    "emulator" :
    process.env.SALES_PORTAL_FIREBASE_CLIENT_EMAIL &&
        process.env.SALES_PORTAL_FIREBASE_PRIVATE_KEY ?
      "service-account" :
      "application-default";

  if (credentialMode === "emulator") {
    return {
      projectId: PROJECT_ID,
      credentialMode,
      options: {
        projectId: PROJECT_ID,
        storageBucket: storageBucket || `${PROJECT_ID}.appspot.com`,
      },
    };
  }

  const clientEmail = process.env.SALES_PORTAL_FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(
    process.env.SALES_PORTAL_FIREBASE_PRIVATE_KEY,
  );

  if (credentialMode === "service-account" && clientEmail && privateKey) {
    return {
      projectId: PROJECT_ID,
      credentialMode,
      options: {
        projectId: PROJECT_ID,
        ...(storageBucket ? { storageBucket } : {}),
        credential: admin.credential.cert({
          projectId: PROJECT_ID,
          clientEmail,
          privateKey,
        }),
      },
    };
  }

  return {
    projectId: PROJECT_ID,
    credentialMode,
    options: {
      projectId: PROJECT_ID,
      ...(storageBucket ? { storageBucket } : {}),
    },
  };
}
