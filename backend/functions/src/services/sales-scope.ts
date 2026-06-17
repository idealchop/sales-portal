import { db } from "../config/firebase-admin";
import type { SalesPortalRole } from "./sales-portal-access";

export type SalesActor = {
  uid: string;
  role: SalesPortalRole;
};

export async function getManagerTeamKey(managerUid: string): Promise<string | null> {
  const snap = await db.collection("sales").doc(managerUid).get();
  if (!snap.exists) return null;

  const data = snap.data() ?? {};
  const location = typeof data.location === "string" ? data.location.trim() : "";
  const displayName =
    typeof data.displayName === "string" ? data.displayName.trim() : "";
  if (!location || !displayName) return null;

  return `${location} (${displayName})`;
}

export async function listTeamMemberUids(managerUid: string): Promise<string[]> {
  const teamKey = await getManagerTeamKey(managerUid);
  if (!teamKey) return [managerUid];

  const snap = await db.collection("sales").where("team", "==", teamKey).get();
  const uids = snap.docs.map((doc) => doc.id);
  if (!uids.includes(managerUid)) uids.push(managerUid);
  return uids;
}

export async function resolveAccessibleUserIds(
  actor: SalesActor,
): Promise<string[] | "all"> {
  if (actor.role === "admin") return "all";
  if (actor.role === "manager") return listTeamMemberUids(actor.uid);
  return [actor.uid];
}

export function canAccessOwner(
  actor: SalesActor,
  ownerId: string,
  accessibleUserIds: string[] | "all",
): boolean {
  if (accessibleUserIds === "all") return true;
  return accessibleUserIds.includes(ownerId);
}
