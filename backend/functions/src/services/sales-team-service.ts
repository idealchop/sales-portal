import { db } from "../config/firebase-admin";
import { getManagerTeamKey, type SalesActor } from "./sales-scope";
import { serializeDoc } from "./sales-serializer";
import { listProposals } from "./proposals-service";
import { listCommissions } from "./commissions-service";

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

export async function getManagerTeamSummary(
  actor: SalesActor,
): Promise<TeamMemberSummary[]> {
  if (actor.role !== "manager" && actor.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  const teamKey =
    actor.role === "admin" ? null : await getManagerTeamKey(actor.uid);

  let memberDocs;
  if (actor.role === "admin") {
    const snap = await db.collection("sales").where("role", "==", "sales").get();
    memberDocs = snap.docs;
  } else if (!teamKey) {
    return [];
  } else {
    const snap = await db.collection("sales").where("team", "==", teamKey).get();
    memberDocs = snap.docs;
  }

  const [proposals, commissions] = await Promise.all([
    listProposals(actor),
    listCommissions(actor),
  ]);

  return memberDocs.map((doc) => {
    const data = serializeDoc<Record<string, unknown>>(doc.id, doc.data() ?? {});
    const memberProposals = proposals.filter((row) => row.userId === doc.id);
    const memberCommissions = commissions.filter((row) => row.userId === doc.id);
    const pendingCommissions = memberCommissions
      .filter((row) => row.status === "pending")
      .reduce((sum, row) => sum + row.amount, 0);

    return {
      id: doc.id,
      displayName: String(data.displayName ?? "Unknown"),
      email: typeof data.email === "string" ? data.email : undefined,
      team: typeof data.team === "string" ? data.team : undefined,
      role: typeof data.role === "string" ? data.role : undefined,
      proposalsCount: memberProposals.length,
      commissionsTotal: memberCommissions.reduce((sum, row) => sum + row.amount, 0),
      pendingCommissions,
    };
  });
}
