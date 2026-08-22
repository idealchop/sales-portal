import { v1 } from "@google-cloud/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { FieldValue, app as firebaseApp } from "../config/firebase-admin";
import { resolveFirestoreDatabaseId } from "../config/dev-tier";

type FirestoreAdminClient = InstanceType<typeof v1.FirestoreAdminClient>;

const SOURCE_DB = "riverdb";
const TARGET_DB = "riverdb-dev";
const CONFIRM_PHRASE = "CLONE PROD TO DEV";
const JOB_DOC_PATH = "sales_portal_ops/clone_prod_to_dev";
const DEFAULT_EXPORT_BUCKET =
  process.env.SALES_PORTAL_FIREBASE_STORAGE_BUCKET || "smartrefill-singapore";

export type CloneProdToDevPhase =
  | "idle"
  | "exporting"
  | "deleting_dev"
  | "creating_dev"
  | "importing"
  | "completed"
  | "failed";

export type CloneProdToDevJob = {
  phase: CloneProdToDevPhase;
  sourceDatabase: typeof SOURCE_DB;
  targetDatabase: typeof TARGET_DB;
  startedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  startedByUid: string | null;
  exportUriPrefix: string | null;
  exportOperation: string | null;
  deleteOperation: string | null;
  createOperation: string | null;
  importOperation: string | null;
  locationId: string | null;
  error: string | null;
  message: string;
};

const ACTIVE_PHASES: CloneProdToDevPhase[] = [
  "exporting",
  "deleting_dev",
  "creating_dev",
  "importing",
];

function projectId(): string {
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.SALES_PORTAL_FIREBASE_PROJECT_ID ||
    "aquaflow-management-suite"
  );
}

function databaseName(databaseId: string): string {
  return `projects/${projectId()}/databases/${databaseId}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function emptyJob(overrides: Partial<CloneProdToDevJob> = {}): CloneProdToDevJob {
  return {
    phase: "idle",
    sourceDatabase: SOURCE_DB,
    targetDatabase: TARGET_DB,
    startedAt: null,
    updatedAt: null,
    completedAt: null,
    startedByUid: null,
    exportUriPrefix: null,
    exportOperation: null,
    deleteOperation: null,
    createOperation: null,
    importOperation: null,
    locationId: null,
    error: null,
    message: "No clone job has been started.",
    ...overrides,
  };
}

function opsDb() {
  // Job metadata always lives on Prod riverdb so Dev wipe cannot erase status.
  return getFirestore(firebaseApp, SOURCE_DB);
}

let adminClient: FirestoreAdminClient | null = null;

function getAdminClient(): FirestoreAdminClient {
  if (!adminClient) {
    adminClient = new v1.FirestoreAdminClient();
  }
  return adminClient;
}

function serializeJob(
  data: FirebaseFirestore.DocumentData | undefined,
): CloneProdToDevJob {
  if (!data) return emptyJob();
  return emptyJob({
    phase: (data.phase as CloneProdToDevPhase) || "idle",
    startedAt: typeof data.startedAt === "string" ? data.startedAt : null,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
    completedAt: typeof data.completedAt === "string" ? data.completedAt : null,
    startedByUid:
      typeof data.startedByUid === "string" ? data.startedByUid : null,
    exportUriPrefix:
      typeof data.exportUriPrefix === "string" ? data.exportUriPrefix : null,
    exportOperation:
      typeof data.exportOperation === "string" ? data.exportOperation : null,
    deleteOperation:
      typeof data.deleteOperation === "string" ? data.deleteOperation : null,
    createOperation:
      typeof data.createOperation === "string" ? data.createOperation : null,
    importOperation:
      typeof data.importOperation === "string" ? data.importOperation : null,
    locationId: typeof data.locationId === "string" ? data.locationId : null,
    error: typeof data.error === "string" ? data.error : null,
    message: typeof data.message === "string" ? data.message : "",
  });
}

async function writeJob(patch: Partial<CloneProdToDevJob>): Promise<CloneProdToDevJob> {
  const ref = opsDb().doc(JOB_DOC_PATH);
  const snap = await ref.get();
  const current = serializeJob(snap.data());
  const next: CloneProdToDevJob = {
    ...current,
    ...patch,
    updatedAt: nowIso(),
  };
  await ref.set(
    {
      ...next,
      writtenAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return next;
}

async function failJob(error: unknown): Promise<CloneProdToDevJob> {
  const message = error instanceof Error ? error.message : String(error);
  logger.error("Clone prod→dev failed", { error: message });
  return writeJob({
    phase: "failed",
    error: message,
    message: `Clone failed: ${message}`,
    completedAt: nowIso(),
  });
}

async function waitOperationDone(
  check: () => Promise<{ done: boolean; error?: string | null }>,
): Promise<{ done: boolean; error?: string | null }> {
  return check();
}

export function assertCloneProdToDevConfirm(confirm: string): void {
  if (confirm.trim() !== CONFIRM_PHRASE) {
    throw new Error("CONFIRM_PHRASE_REQUIRED");
  }
}

export function assertCloneRunsOnProdApi(): void {
  const current = resolveFirestoreDatabaseId();
  if (current !== SOURCE_DB) {
    throw new Error("MUST_RUN_ON_PROD_API");
  }
}

export async function getCloneProdToDevJob(): Promise<CloneProdToDevJob> {
  assertCloneRunsOnProdApi();
  const snap = await opsDb().doc(JOB_DOC_PATH).get();
  return serializeJob(snap.data());
}

export async function startCloneProdToDev(input: {
  actorUid: string;
  confirm: string;
}): Promise<CloneProdToDevJob> {
  assertCloneRunsOnProdApi();
  assertCloneProdToDevConfirm(input.confirm);

  const existing = await getCloneProdToDevJob();
  if (ACTIVE_PHASES.includes(existing.phase)) {
    return existing;
  }

  const client = getAdminClient();
  const [sourceDb] = await client.getDatabase({ name: databaseName(SOURCE_DB) });
  const locationId = sourceDb.locationId || "asia-southeast1";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const exportUriPrefix =
    `gs://${DEFAULT_EXPORT_BUCKET}/sales-portal/firestore-exports/` +
    `riverdb-${stamp}`;

  const [exportOp] = await client.exportDocuments({
    name: databaseName(SOURCE_DB),
    outputUriPrefix: exportUriPrefix,
  });

  return writeJob({
    phase: "exporting",
    startedAt: nowIso(),
    completedAt: null,
    startedByUid: input.actorUid,
    exportUriPrefix,
    exportOperation: exportOp.name || null,
    deleteOperation: null,
    createOperation: null,
    importOperation: null,
    locationId,
    error: null,
    message: `Exporting ${SOURCE_DB} to ${exportUriPrefix}…`,
  });
}

export async function tickCloneProdToDev(): Promise<CloneProdToDevJob> {
  assertCloneRunsOnProdApi();
  const job = await getCloneProdToDevJob();
  if (!ACTIVE_PHASES.includes(job.phase)) {
    return job;
  }

  const client = getAdminClient();

  try {
    if (job.phase === "exporting") {
      if (!job.exportOperation) {
        return failJob(new Error("Missing export operation."));
      }
      const op = await client.checkExportDocumentsProgress(job.exportOperation);
      const status = await waitOperationDone(async () => ({
        done: Boolean(op.done),
        error: op.error?.message || null,
      }));
      if (status.error) return failJob(new Error(status.error));
      if (!status.done) {
        return writeJob({
          message: `Still exporting ${SOURCE_DB}…`,
        });
      }

      let deleteOperation: string | null = null;
      try {
        const [deleteOp] = await client.deleteDatabase({
          name: databaseName(TARGET_DB),
        });
        deleteOperation = deleteOp.name || null;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const lower = message.toLowerCase();
        if (lower.includes("not found") || lower.includes("404")) {
          const locationId = job.locationId || "asia-southeast1";
          const [createOp] = await client.createDatabase({
            parent: `projects/${projectId()}`,
            databaseId: TARGET_DB,
            database: {
              locationId,
              type: "FIRESTORE_NATIVE",
            },
          });
          return writeJob({
            phase: "creating_dev",
            deleteOperation: null,
            createOperation: createOp.name || null,
            message:
              `${TARGET_DB} was already absent. Creating a fresh database…`,
          });
        }
        return failJob(error);
      }

      return writeJob({
        phase: "deleting_dev",
        deleteOperation,
        message: `Export complete. Deleting old ${TARGET_DB}…`,
      });
    }

    if (job.phase === "deleting_dev") {
      if (!job.deleteOperation) {
        return failJob(new Error("Missing delete operation."));
      }
      const op = await client.checkDeleteDatabaseProgress(job.deleteOperation);
      const status = await waitOperationDone(async () => ({
        done: Boolean(op.done),
        error: op.error?.message || null,
      }));
      if (status.error) {
        // Database may already be gone from a prior attempt.
        const msg = status.error.toLowerCase();
        if (!msg.includes("not found") && !msg.includes("404")) {
          return failJob(new Error(status.error));
        }
      } else if (!status.done) {
        return writeJob({
          message: `Still deleting ${TARGET_DB}…`,
        });
      }

      const locationId = job.locationId || "asia-southeast1";
      const [createOp] = await client.createDatabase({
        parent: `projects/${projectId()}`,
        databaseId: TARGET_DB,
        database: {
          locationId,
          type: "FIRESTORE_NATIVE",
        },
      });
      return writeJob({
        phase: "creating_dev",
        createOperation: createOp.name || null,
        message: `Recreating empty ${TARGET_DB} in ${locationId}…`,
      });
    }

    if (job.phase === "creating_dev") {
      if (!job.createOperation) {
        return failJob(new Error("Missing create operation."));
      }
      const op = await client.checkCreateDatabaseProgress(job.createOperation);
      const status = await waitOperationDone(async () => ({
        done: Boolean(op.done),
        error: op.error?.message || null,
      }));
      if (status.error) return failJob(new Error(status.error));
      if (!status.done) {
        return writeJob({
          message: `Still creating ${TARGET_DB}…`,
        });
      }
      if (!job.exportUriPrefix) {
        return failJob(new Error("Missing export URI prefix."));
      }

      const [importOp] = await client.importDocuments({
        name: databaseName(TARGET_DB),
        inputUriPrefix: job.exportUriPrefix,
      });
      return writeJob({
        phase: "importing",
        importOperation: importOp.name || null,
        message: `Importing export into ${TARGET_DB}…`,
      });
    }

    if (job.phase === "importing") {
      if (!job.importOperation) {
        return failJob(new Error("Missing import operation."));
      }
      const op = await client.checkImportDocumentsProgress(job.importOperation);
      const status = await waitOperationDone(async () => ({
        done: Boolean(op.done),
        error: op.error?.message || null,
      }));
      if (status.error) return failJob(new Error(status.error));
      if (!status.done) {
        return writeJob({
          message: `Still importing into ${TARGET_DB}…`,
        });
      }

      return writeJob({
        phase: "completed",
        completedAt: nowIso(),
        error: null,
        message:
          `${TARGET_DB} was replaced with a fresh copy of ${SOURCE_DB}. ` +
          "Redeploy Firestore rules/indexes to Dev if needed " +
          "(ENV=dev DEPLOY_FIRESTORE=1 ./deploy.sh). Auth was not modified.",
      });
    }

    return job;
  } catch (error) {
    return failJob(error);
  }
}

export const CLONE_PROD_TO_DEV_CONFIRM_PHRASE = CONFIRM_PHRASE;
