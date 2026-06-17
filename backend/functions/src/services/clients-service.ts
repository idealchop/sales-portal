import { db, FieldValue } from "../config/firebase-admin";
import {
  canAccessOwner,
  resolveAccessibleUserIds,
  type SalesActor,
} from "./sales-scope";
import { serializeDoc } from "./sales-serializer";

export type ClientStatus = "active" | "unpaid" | "pending";
export type ClientType =
  | "household"
  | "sme"
  | "commercial"
  | "corporate"
  | "enterprise";

export type ClientRecord = {
  id: string;
  userId: string;
  companyName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: ClientStatus;
  address?: string;
  clientType?: ClientType;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const VALID_STATUSES = new Set<ClientStatus>(["active", "unpaid", "pending"]);
const VALID_TYPES = new Set<ClientType>([
  "household",
  "sme",
  "commercial",
  "corporate",
  "enterprise",
]);

function normalizeClient(id: string, data: Record<string, unknown>): ClientRecord {
  const serialized = serializeDoc<ClientRecord>(id, data);
  return {
    ...serialized,
    companyName: String(serialized.companyName ?? ""),
    contactName: String(serialized.contactName ?? ""),
  };
}

export async function listClients(actor: SalesActor): Promise<ClientRecord[]> {
  const accessible = await resolveAccessibleUserIds(actor);

  if (accessible === "all") {
    const snap = await db.collection("clients").get();
    return snap.docs
      .map((doc) => normalizeClient(doc.id, doc.data()))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  if (accessible.length === 1) {
    const snap = await db
      .collection("clients")
      .where("userId", "==", accessible[0])
      .get();
    return snap.docs
      .map((doc) => normalizeClient(doc.id, doc.data()))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  const snap = await db.collection("clients").get();
  const allowed = new Set(accessible);
  return snap.docs
    .map((doc) => normalizeClient(doc.id, doc.data()))
    .filter((row) => allowed.has(row.userId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getClient(
  actor: SalesActor,
  clientId: string,
): Promise<ClientRecord | null> {
  const snap = await db.collection("clients").doc(clientId).get();
  if (!snap.exists) return null;

  const client = normalizeClient(snap.id, snap.data() ?? {});
  const accessible = await resolveAccessibleUserIds(actor);
  if (!canAccessOwner(actor, client.userId, accessible)) return null;
  return client;
}

export type CreateClientInput = {
  companyName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: ClientStatus;
  address?: string;
  clientType?: ClientType;
};

export async function createClient(
  actor: SalesActor,
  input: CreateClientInput,
): Promise<ClientRecord> {
  if (!input.companyName?.trim() || !input.contactName?.trim()) {
    throw new Error("CLIENT_FIELDS_REQUIRED");
  }

  const status =
    input.status && VALID_STATUSES.has(input.status) ? input.status : "pending";
  const clientType =
    input.clientType && VALID_TYPES.has(input.clientType) ?
      input.clientType :
      "sme";

  const ref = db.collection("clients").doc();
  const payload = {
    userId: actor.uid,
    companyName: input.companyName.trim(),
    contactName: input.contactName.trim(),
    contactEmail: input.contactEmail?.trim() || "",
    contactPhone: input.contactPhone?.trim() || "",
    status,
    address: input.address?.trim() || "",
    clientType,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await ref.set(payload);
  const saved = await ref.get();
  return normalizeClient(saved.id, saved.data() ?? {});
}

export type UpdateClientInput = Partial<CreateClientInput>;

export async function updateClient(
  actor: SalesActor,
  clientId: string,
  input: UpdateClientInput,
): Promise<ClientRecord> {
  const existing = await getClient(actor, clientId);
  if (!existing) throw new Error("NOT_FOUND");

  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (input.companyName !== undefined) patch.companyName = input.companyName.trim();
  if (input.contactName !== undefined) patch.contactName = input.contactName.trim();
  if (input.contactEmail !== undefined) patch.contactEmail = input.contactEmail.trim();
  if (input.contactPhone !== undefined) patch.contactPhone = input.contactPhone.trim();
  if (input.address !== undefined) patch.address = input.address.trim();
  if (input.status !== undefined) {
    if (!VALID_STATUSES.has(input.status)) throw new Error("INVALID_STATUS");
    patch.status = input.status;
  }
  if (input.clientType !== undefined) {
    if (!VALID_TYPES.has(input.clientType)) throw new Error("INVALID_TYPE");
    patch.clientType = input.clientType;
  }

  await db.collection("clients").doc(clientId).set(patch, { merge: true });
  const saved = await db.collection("clients").doc(clientId).get();
  return normalizeClient(saved.id, saved.data() ?? {});
}
