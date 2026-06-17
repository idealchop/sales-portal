import { db } from "../config/firebase-admin";
import {
  canAccessOwner,
  resolveAccessibleUserIds,
  type SalesActor,
} from "./sales-scope";
import { serializeDoc } from "./sales-serializer";

export type CommissionRecord = {
  id: string;
  userId: string;
  proposalId?: string;
  amount: number;
  status: "pending" | "paid";
  type: "commission" | "bonus";
  description: string;
  createdAt?: string | null;
  referenceId?: string;
};

function normalizeCommission(
  id: string,
  data: Record<string, unknown>,
): CommissionRecord {
  const serialized = serializeDoc<CommissionRecord>(id, data);
  return {
    ...serialized,
    amount: Number(serialized.amount ?? 0),
    status: serialized.status === "paid" ? "paid" : "pending",
    type: serialized.type === "bonus" ? "bonus" : "commission",
    description: String(serialized.description ?? ""),
  };
}

export async function listCommissions(
  actor: SalesActor,
): Promise<CommissionRecord[]> {
  const accessible = await resolveAccessibleUserIds(actor);
  const snap = await db.collection("commissions").get();

  return snap.docs
    .map((doc) => normalizeCommission(doc.id, doc.data()))
    .filter((row) => canAccessOwner(actor, row.userId, accessible))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
