import { db } from "../config/firebase-admin";
import { getManagerTeamKey, type SalesActor } from "./sales-scope";
import { serializeDoc } from "./sales-serializer";
import { listProposals } from "./proposals-service";
import { listCommissions } from "./commissions-service";
import {
  extractRiverUserProfile,
  getSalesPortalAccess,
} from "./sales-portal-access";

export type TeamMemberSummary = {
  id: string;
  displayName: string;
  email?: string;
  team?: string;
  role?: string;
  proposalsCount: number;
  commissionsTotal: number;
  pendingCommissions: number;
};

function emptyStats(): Pick<
  TeamMemberSummary,
  "proposalsCount" | "commissionsTotal" | "pendingCommissions"
  > {
  return {
    proposalsCount: 0,
    commissionsTotal: 0,
    pendingCommissions: 0,
  };
}

function withActivityStats(
  member: TeamMemberSummary,
  proposals: Array<{ userId: string }>,
  commissions: Array<{ userId: string; amount: number; status: string }>,
): TeamMemberSummary {
  const memberProposals = proposals.filter((row) => row.userId === member.id);
  const memberCommissions = commissions.filter(
    (row) => row.userId === member.id,
  );
  const pendingCommissions = memberCommissions
    .filter((row) => row.status === "pending")
    .reduce((sum, row) => sum + row.amount, 0);

  return {
    ...member,
    proposalsCount: memberProposals.length,
    commissionsTotal: memberCommissions.reduce(
      (sum, row) => sum + row.amount,
      0,
    ),
    pendingCommissions,
  };
}

/**
 * Everyone with active Sales Portal access (users.appAccess) plus sales/{uid}
 * profiles. Used so assignees include admins/managers, not only role=sales.
 */
export async function listSalesPortalAccounts(): Promise<TeamMemberSummary[]> {
  const [salesSnap, usersSnap] = await Promise.all([
    db.collection("sales").get(),
    db.collection("users").get(),
  ]);

  const byId = new Map<string, TeamMemberSummary>();

  for (const doc of usersSnap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    const access = getSalesPortalAccess(data.appAccess);
    if (!access) continue;
    const profile = extractRiverUserProfile(data);
    byId.set(doc.id, {
      id: doc.id,
      displayName:
        profile.displayName ||
        profile.email ||
        "Sales account",
      email: profile.email,
      role:
        typeof access.role === "string" && access.role.trim() ?
          access.role.trim() :
          undefined,
      ...emptyStats(),
    });
  }

  for (const doc of salesSnap.docs) {
    const data = serializeDoc<Record<string, unknown>>(doc.id, doc.data() ?? {});
    const existing = byId.get(doc.id);
    const displayName = String(
      data.displayName || existing?.displayName || "Unknown",
    ).trim() || "Unknown";
    const email =
      typeof data.email === "string" && data.email.trim() ?
        data.email.trim() :
        existing?.email;
    byId.set(doc.id, {
      id: doc.id,
      displayName,
      email,
      team: typeof data.team === "string" ? data.team : existing?.team,
      role:
        typeof data.role === "string" && data.role.trim() ?
          data.role.trim() :
          existing?.role,
      ...emptyStats(),
    });
  }

  return [...byId.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: "base",
    }),
  );
}

/** Assignable accounts for lead pipeline (all Sales Portal access). */
export async function listLeadAssignees(
  actor: SalesActor,
): Promise<TeamMemberSummary[]> {
  const accounts = await listSalesPortalAccounts();
  if (!accounts.some((row) => row.id === actor.uid)) {
    accounts.push({
      id: actor.uid,
      displayName: "You",
      role: actor.role,
      ...emptyStats(),
    });
    accounts.sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, {
        sensitivity: "base",
      }),
    );
  }
  return accounts;
}

export async function getManagerTeamSummary(
  actor: SalesActor,
): Promise<TeamMemberSummary[]> {
  if (actor.role !== "manager" && actor.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  const [proposals, commissions] = await Promise.all([
    listProposals(actor),
    listCommissions(actor),
  ]);

  // Admins manage the full Sales Portal roster (any role with access).
  if (actor.role === "admin") {
    const accounts = await listSalesPortalAccounts();
    return accounts.map((member) =>
      withActivityStats(member, proposals, commissions),
    );
  }

  const teamKey = await getManagerTeamKey(actor.uid);
  if (!teamKey) {
    const self = (await listSalesPortalAccounts()).find(
      (row) => row.id === actor.uid,
    );
    return self ? [withActivityStats(self, proposals, commissions)] : [];
  }

  const snap = await db.collection("sales").where("team", "==", teamKey).get();
  const memberDocs = snap.docs;

  return memberDocs.map((doc) => {
    const data = serializeDoc<Record<string, unknown>>(doc.id, doc.data() ?? {});
    return withActivityStats(
      {
        id: doc.id,
        displayName: String(data.displayName ?? "Unknown"),
        email: typeof data.email === "string" ? data.email : undefined,
        team: typeof data.team === "string" ? data.team : undefined,
        role: typeof data.role === "string" ? data.role : undefined,
        ...emptyStats(),
      },
      proposals,
      commissions,
    );
  });
}
