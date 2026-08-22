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

export type ClientAppAccess = {
  appId: string;
  role?: string;
  label: string;
};

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
  /** Platform `users/{uid}` this CRM client is linked to. */
  linkedUserId?: string;
  /** Active apps from the linked user (or manually set). */
  appIds?: string[];
  apps?: ClientAppAccess[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ClientDirectoryEntry = {
  linkedUserId: string;
  displayName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  apps: ClientAppAccess[];
  appIds: string[];
  /** Existing CRM client id when already linked for this actor's scope. */
  clientId?: string;
  clientStatus?: ClientStatus;
};

const VALID_STATUSES = new Set<ClientStatus>(["active", "unpaid", "pending"]);
const VALID_TYPES = new Set<ClientType>([
  "household",
  "sme",
  "commercial",
  "corporate",
  "enterprise",
]);

const KNOWN_APP_LABELS: Record<string, string> = {
  "smartrefill": "Smart Refill",
  "sales-portal": "Sales Portal",
};

export function appLabelForId(appId: string): string {
  const known = KNOWN_APP_LABELS[appId];
  if (known) return known;
  return appId
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function extractActiveApps(appAccess: unknown): ClientAppAccess[] {
  if (!Array.isArray(appAccess)) return [];

  const byApp = new Map<string, ClientAppAccess>();
  for (const row of appAccess) {
    if (!row || typeof row !== "object") continue;
    const entry = row as {
      appId?: string;
      role?: string;
      accessRevoked?: boolean;
    };
    if (entry.accessRevoked === true) continue;
    const appId = String(entry.appId || "").trim();
    if (!appId) continue;
    const role =
      typeof entry.role === "string" && entry.role.trim() ?
        entry.role.trim() :
        undefined;
    const existing = byApp.get(appId);
    if (!existing) {
      byApp.set(appId, { appId, role, label: appLabelForId(appId) });
      continue;
    }
    if (!existing.role && role) {
      byApp.set(appId, { ...existing, role });
    }
  }

  return [...byApp.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function displayNameFromUserData(data: Record<string, unknown>): string {
  for (const key of ["displayName", "fullName", "name"] as const) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  if (typeof data.email === "string" && data.email.trim()) {
    return data.email.trim();
  }
  return "Unknown user";
}

function companyNameFromUserData(data: Record<string, unknown>): string {
  for (const key of ["companyName", "businessName", "organization"] as const) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return displayNameFromUserData(data);
}

export function userDocToDirectoryEntry(
  uid: string,
  data: Record<string, unknown>,
  linkedClient?: Pick<ClientRecord, "id" | "status">,
): ClientDirectoryEntry | null {
  const apps = extractActiveApps(data.appAccess);
  if (apps.length === 0) return null;

  const email =
    typeof data.email === "string" && data.email.trim() ?
      data.email.trim() :
      undefined;
  const phone =
    typeof data.phone === "string" && data.phone.trim() ?
      data.phone.trim() :
      undefined;

  return {
    linkedUserId: uid,
    displayName: displayNameFromUserData(data),
    email,
    phone,
    companyName: companyNameFromUserData(data),
    apps,
    appIds: apps.map((app) => app.appId),
    clientId: linkedClient?.id,
    clientStatus: linkedClient?.status,
  };
}

function attachApps(client: ClientRecord): ClientRecord {
  const appIds = Array.isArray(client.appIds) ?
    client.appIds.filter((id) => typeof id === "string" && id.trim()) :
    [];
  const apps =
    Array.isArray(client.apps) && client.apps.length > 0 ?
      client.apps :
      appIds.map((appId) => ({
        appId,
        label: appLabelForId(appId),
      }));

  return {
    ...client,
    appIds: apps.map((app) => app.appId),
    apps,
  };
}

function normalizeClient(id: string, data: Record<string, unknown>): ClientRecord {
  const serialized = serializeDoc<ClientRecord>(id, data);
  const linkedUserId =
    typeof serialized.linkedUserId === "string" && serialized.linkedUserId.trim() ?
      serialized.linkedUserId.trim() :
      undefined;
  const appIds = Array.isArray(serialized.appIds) ?
    serialized.appIds
      .map((id) => String(id || "").trim())
      .filter(Boolean) :
    [];

  return attachApps({
    ...serialized,
    companyName: String(serialized.companyName ?? ""),
    contactName: String(serialized.contactName ?? ""),
    linkedUserId,
    appIds,
  });
}

async function enrichClientsWithLinkedUserApps(
  clients: ClientRecord[],
): Promise<ClientRecord[]> {
  const linkedIds = [
    ...new Set(
      clients
        .map((client) => client.linkedUserId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (linkedIds.length === 0) return clients.map(attachApps);

  const snaps = await Promise.all(
    linkedIds.map((uid) => db.collection("users").doc(uid).get()),
  );
  const appsByUser = new Map<string, ClientAppAccess[]>();
  for (const snap of snaps) {
    if (!snap.exists) continue;
    appsByUser.set(snap.id, extractActiveApps(snap.data()?.appAccess));
  }

  return clients.map((client) => {
    if (!client.linkedUserId) return attachApps(client);
    const apps = appsByUser.get(client.linkedUserId);
    if (!apps) return attachApps(client);
    return attachApps({
      ...client,
      appIds: apps.map((app) => app.appId),
      apps,
    });
  });
}

export async function listClients(actor: SalesActor): Promise<ClientRecord[]> {
  const accessible = await resolveAccessibleUserIds(actor);

  let clients: ClientRecord[];
  if (accessible === "all") {
    const snap = await db.collection("clients").get();
    clients = snap.docs.map((doc) => normalizeClient(doc.id, doc.data()));
  } else if (accessible.length === 1) {
    const snap = await db
      .collection("clients")
      .where("userId", "==", accessible[0])
      .get();
    clients = snap.docs.map((doc) => normalizeClient(doc.id, doc.data()));
  } else {
    const snap = await db.collection("clients").get();
    const allowed = new Set(accessible);
    clients = snap.docs
      .map((doc) => normalizeClient(doc.id, doc.data()))
      .filter((row) => allowed.has(row.userId));
  }

  const enriched = await enrichClientsWithLinkedUserApps(clients);
  return enriched.sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt)),
  );
}

/**
 * Platform users as client candidates, categorized by app via `users.appAccess`.
 * Joins CRM clients the actor can access when `linkedUserId` matches.
 */
export async function listClientDirectory(
  actor: SalesActor,
): Promise<ClientDirectoryEntry[]> {
  const [usersSnap, clients] = await Promise.all([
    db.collection("users").get(),
    listClients(actor),
  ]);

  const clientByLinkedUser = new Map<string, ClientRecord>();
  for (const client of clients) {
    if (!client.linkedUserId) continue;
    const existing = clientByLinkedUser.get(client.linkedUserId);
    if (!existing) {
      clientByLinkedUser.set(client.linkedUserId, client);
      continue;
    }
    // Prefer the most recently created CRM record when duplicates exist.
    if (String(client.createdAt).localeCompare(String(existing.createdAt)) > 0) {
      clientByLinkedUser.set(client.linkedUserId, client);
    }
  }

  const directory: ClientDirectoryEntry[] = [];
  for (const doc of usersSnap.docs) {
    const linked = clientByLinkedUser.get(doc.id);
    const entry = userDocToDirectoryEntry(doc.id, doc.data() ?? {}, linked ?
      { id: linked.id, status: linked.status } :
      undefined);
    if (entry) directory.push(entry);
  }

  return directory.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: "base",
    }),
  );
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

  const [enriched] = await enrichClientsWithLinkedUserApps([client]);
  return enriched;
}

export type CreateClientInput = {
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: ClientStatus;
  address?: string;
  clientType?: ClientType;
  linkedUserId?: string;
  appIds?: string[];
};

async function findOwnedClientForLinkedUser(
  actor: SalesActor,
  linkedUserId: string,
): Promise<ClientRecord | null> {
  const snap = await db
    .collection("clients")
    .where("linkedUserId", "==", linkedUserId)
    .get();
  if (snap.empty) return null;

  const accessible = await resolveAccessibleUserIds(actor);
  const matches = snap.docs
    .map((doc) => normalizeClient(doc.id, doc.data()))
    .filter((row) => canAccessOwner(actor, row.userId, accessible))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  if (matches.length === 0) return null;
  const [enriched] = await enrichClientsWithLinkedUserApps([matches[0]]);
  return enriched;
}

export async function createClient(
  actor: SalesActor,
  input: CreateClientInput,
): Promise<ClientRecord> {
  const linkedUserId = input.linkedUserId?.trim() || undefined;

  if (linkedUserId) {
    const existing = await findOwnedClientForLinkedUser(actor, linkedUserId);
    if (existing) return existing;

    const userSnap = await db.collection("users").doc(linkedUserId).get();
    if (!userSnap.exists) throw new Error("LINKED_USER_NOT_FOUND");

    const userData = userSnap.data() ?? {};
    const apps = extractActiveApps(userData.appAccess);
    const companyName =
      input.companyName?.trim() || companyNameFromUserData(userData);
    const contactName =
      input.contactName?.trim() || displayNameFromUserData(userData);
    const contactEmail =
      input.contactEmail?.trim() ||
      (typeof userData.email === "string" ? userData.email.trim() : "");
    const contactPhone =
      input.contactPhone?.trim() ||
      (typeof userData.phone === "string" ? userData.phone.trim() : "");

    const status =
      input.status && VALID_STATUSES.has(input.status) ? input.status : "pending";
    const clientType =
      input.clientType && VALID_TYPES.has(input.clientType) ?
        input.clientType :
        "sme";

    const ref = db.collection("clients").doc();
    const payload = {
      userId: actor.uid,
      linkedUserId,
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      status,
      address: input.address?.trim() || "",
      clientType,
      appIds: apps.map((app) => app.appId),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await ref.set(payload);
    const saved = await ref.get();
    return attachApps({
      ...normalizeClient(saved.id, saved.data() ?? {}),
      apps,
      appIds: apps.map((app) => app.appId),
    });
  }

  if (!input.companyName?.trim() || !input.contactName?.trim()) {
    throw new Error("CLIENT_FIELDS_REQUIRED");
  }

  const status =
    input.status && VALID_STATUSES.has(input.status) ? input.status : "pending";
  const clientType =
    input.clientType && VALID_TYPES.has(input.clientType) ?
      input.clientType :
      "sme";
  const manualAppIds = Array.isArray(input.appIds) ?
    [...new Set(input.appIds.map((id) => String(id || "").trim()).filter(Boolean))] :
    [];

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
    appIds: manualAppIds,
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

  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (input.companyName !== undefined) patch.companyName = input.companyName.trim();
  if (input.contactName !== undefined) patch.contactName = input.contactName.trim();
  if (input.contactEmail !== undefined) {
    patch.contactEmail = input.contactEmail.trim();
  }
  if (input.contactPhone !== undefined) {
    patch.contactPhone = input.contactPhone.trim();
  }
  if (input.address !== undefined) patch.address = input.address.trim();
  if (input.status !== undefined) {
    if (!VALID_STATUSES.has(input.status)) throw new Error("INVALID_STATUS");
    patch.status = input.status;
  }
  if (input.clientType !== undefined) {
    if (!VALID_TYPES.has(input.clientType)) throw new Error("INVALID_TYPE");
    patch.clientType = input.clientType;
  }
  if (input.linkedUserId !== undefined) {
    const linkedUserId = input.linkedUserId.trim();
    if (!linkedUserId) {
      patch.linkedUserId = FieldValue.delete();
    } else {
      const userSnap = await db.collection("users").doc(linkedUserId).get();
      if (!userSnap.exists) throw new Error("LINKED_USER_NOT_FOUND");
      patch.linkedUserId = linkedUserId;
      const apps = extractActiveApps(userSnap.data()?.appAccess);
      patch.appIds = apps.map((app) => app.appId);
    }
  }
  if (input.appIds !== undefined && input.linkedUserId === undefined) {
    patch.appIds = [
      ...new Set(
        input.appIds.map((id) => String(id || "").trim()).filter(Boolean),
      ),
    ];
  }

  await db.collection("clients").doc(clientId).set(patch, { merge: true });
  const saved = await getClient(actor, clientId);
  if (!saved) throw new Error("NOT_FOUND");
  return saved;
}
