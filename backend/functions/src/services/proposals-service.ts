import { randomBytes } from "crypto";
import { db, FieldValue } from "../config/firebase-admin";
import {
  canAccessOwner,
  resolveAccessibleUserIds,
  type SalesActor,
} from "./sales-scope";
import { serializeDoc } from "./sales-serializer";

export type ProposalStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "finalized";

export type ProposalRecord = {
  id: string;
  clientId: string;
  userId: string;
  title?: string;
  content?: string;
  status: ProposalStatus;
  amount: number;
  createdAt?: string | null;
  sourceLocation?: string;
  planId?: string;
  planName?: string;
};

const VALID_STATUSES = new Set<ProposalStatus>([
  "draft",
  "sent",
  "accepted",
  "rejected",
  "finalized",
]);

function normalizeProposal(
  id: string,
  data: Record<string, unknown>,
): ProposalRecord {
  const serialized = serializeDoc<ProposalRecord>(id, data);
  return {
    ...serialized,
    amount: Number(serialized.amount ?? 0),
    status: (VALID_STATUSES.has(serialized.status as ProposalStatus) ?
      serialized.status
    : "draft") as ProposalStatus,
  };
}

async function filterProposalsForActor(
  actor: SalesActor,
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
): Promise<ProposalRecord[]> {
  const accessible = await resolveAccessibleUserIds(actor);
  return docs
    .map((doc) => normalizeProposal(doc.id, doc.data()))
    .filter((row) => canAccessOwner(actor, row.userId, accessible));
}

export async function listProposals(actor: SalesActor): Promise<ProposalRecord[]> {
  const accessible = await resolveAccessibleUserIds(actor);

  if (accessible === "all") {
    const snap = await db.collection("proposals").get();
    return snap.docs
      .map((doc) => normalizeProposal(doc.id, doc.data()))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  if (accessible.length === 1) {
    const snap = await db
      .collection("proposals")
      .where("userId", "==", accessible[0])
      .get();
    return snap.docs
      .map((doc) => normalizeProposal(doc.id, doc.data()))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  const snap = await db.collection("proposals").get();
  return filterProposalsForActor(actor, snap.docs);
}

export async function getProposal(
  actor: SalesActor,
  proposalId: string,
): Promise<ProposalRecord | null> {
  const snap = await db.collection("proposals").doc(proposalId).get();
  if (!snap.exists) return null;

  const proposal = normalizeProposal(snap.id, snap.data() ?? {});
  const accessible = await resolveAccessibleUserIds(actor);
  if (!canAccessOwner(actor, proposal.userId, accessible)) return null;
  return proposal;
}

export type CreateProposalInput = {
  clientId: string;
  title?: string;
  content?: string;
  status?: ProposalStatus;
  amount?: number;
  sourceLocation?: string;
  planId?: string;
  planName?: string;
};

export async function createProposal(
  actor: SalesActor,
  input: CreateProposalInput,
): Promise<ProposalRecord> {
  if (!input.clientId?.trim()) {
    throw new Error("CLIENT_ID_REQUIRED");
  }

  const clientSnap = await db.collection("clients").doc(input.clientId).get();
  if (!clientSnap.exists) throw new Error("CLIENT_NOT_FOUND");

  const client = clientSnap.data() ?? {};
  const clientOwner = String(client.userId || "");
  const accessible = await resolveAccessibleUserIds(actor);
  if (!canAccessOwner(actor, clientOwner, accessible)) {
    throw new Error("CLIENT_FORBIDDEN");
  }

  const status =
    input.status && VALID_STATUSES.has(input.status) ? input.status : "draft";

  const ref = db.collection("proposals").doc();
  const payload = {
    clientId: input.clientId,
    userId: actor.uid,
    title: input.title?.trim() || "Untitled proposal",
    content: input.content?.trim() || "",
    status,
    amount: Number(input.amount ?? 0),
    sourceLocation: input.sourceLocation?.trim() || null,
    planId: input.planId?.trim() || null,
    planName: input.planName?.trim() || null,
    createdAt: FieldValue.serverTimestamp(),
  };

  await ref.set(payload);
  const saved = await ref.get();
  return normalizeProposal(saved.id, saved.data() ?? {});
}

export type UpdateProposalInput = Partial<CreateProposalInput>;

export async function updateProposal(
  actor: SalesActor,
  proposalId: string,
  input: UpdateProposalInput,
): Promise<ProposalRecord> {
  const existing = await getProposal(actor, proposalId);
  if (!existing) throw new Error("NOT_FOUND");

  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.content !== undefined) patch.content = input.content.trim();
  if (input.amount !== undefined) patch.amount = Number(input.amount);
  if (input.sourceLocation !== undefined) {
    patch.sourceLocation = input.sourceLocation.trim();
  }
  if (input.planId !== undefined) patch.planId = input.planId.trim();
  if (input.planName !== undefined) patch.planName = input.planName.trim();
  if (input.status !== undefined) {
    if (!VALID_STATUSES.has(input.status)) throw new Error("INVALID_STATUS");
    patch.status = input.status;
  }

  await db.collection("proposals").doc(proposalId).set(patch, { merge: true });
  const saved = await db.collection("proposals").doc(proposalId).get();
  return normalizeProposal(saved.id, saved.data() ?? {});
}

export async function createProposalShareLink(
  actor: SalesActor,
  proposalId: string,
): Promise<{ linkId: string; proposalId: string; clientId: string }> {
  const proposal = await getProposal(actor, proposalId);
  if (!proposal) throw new Error("NOT_FOUND");

  const linkId = randomBytes(16).toString("hex");
  await db.collection("shareable_links").doc(linkId).set({
    proposalId,
    clientId: proposal.clientId,
    createdBy: actor.uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { linkId, proposalId, clientId: proposal.clientId };
}

export async function getPublicProposalByLink(linkId: string) {
  const linkSnap = await db.collection("shareable_links").doc(linkId).get();
  if (!linkSnap.exists) return null;

  const link = linkSnap.data() ?? {};
  const proposalId = String(link.proposalId || "");
  const clientId = String(link.clientId || "");
  if (!proposalId || !clientId) return null;

  const [proposalSnap, clientSnap] = await Promise.all([
    db.collection("proposals").doc(proposalId).get(),
    db.collection("clients").doc(clientId).get(),
  ]);

  if (!proposalSnap.exists || !clientSnap.exists) return null;

  return {
    proposal: normalizeProposal(proposalSnap.id, proposalSnap.data() ?? {}),
    client: serializeDoc(clientSnap.id, clientSnap.data() ?? {}),
  };
}
