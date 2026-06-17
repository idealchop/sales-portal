import { db, FieldValue } from "../config/firebase-admin";
import type { SalesActor } from "./sales-scope";
import { serializeDoc } from "./sales-serializer";

export type SalesMaterialRecord = {
  id: string;
  title: string;
  description?: string;
  type: "pdf" | "image" | "link" | "video";
  url: string;
  imageId?: string;
  createdAt?: string | null;
};

const VALID_TYPES = new Set<SalesMaterialRecord["type"]>([
  "pdf",
  "image",
  "link",
  "video",
]);

function normalizeMaterial(
  id: string,
  data: Record<string, unknown>,
): SalesMaterialRecord {
  const serialized = serializeDoc<SalesMaterialRecord>(id, data);
  const type = VALID_TYPES.has(serialized.type as SalesMaterialRecord["type"]) ?
    (serialized.type as SalesMaterialRecord["type"]) :
    "link";
  return {
    ...serialized,
    title: String(serialized.title ?? "Untitled"),
    url: String(serialized.url ?? ""),
    type,
  };
}

export async function listSalesMaterials(): Promise<SalesMaterialRecord[]> {
  const snap = await db.collection("sales_materials").get();
  return snap.docs
    .map((doc) => normalizeMaterial(doc.id, doc.data()))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export type UpsertSalesMaterialInput = {
  title: string;
  description?: string;
  type?: SalesMaterialRecord["type"];
  url: string;
  imageId?: string;
};

export async function createSalesMaterial(
  input: UpsertSalesMaterialInput,
): Promise<SalesMaterialRecord> {
  if (!input.title?.trim() || !input.url?.trim()) {
    throw new Error("MATERIAL_FIELDS_REQUIRED");
  }

  const type =
    input.type && VALID_TYPES.has(input.type) ? input.type : "link";
  const ref = db.collection("sales_materials").doc();
  await ref.set({
    title: input.title.trim(),
    description: input.description?.trim() || "",
    type,
    url: input.url.trim(),
    imageId: input.imageId?.trim() || "",
    createdAt: FieldValue.serverTimestamp(),
  });

  const saved = await ref.get();
  return normalizeMaterial(saved.id, saved.data() ?? {});
}

export async function updateSalesMaterial(
  materialId: string,
  input: UpsertSalesMaterialInput,
): Promise<SalesMaterialRecord> {
  const snap = await db.collection("sales_materials").doc(materialId).get();
  if (!snap.exists) throw new Error("NOT_FOUND");

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.url !== undefined) patch.url = input.url.trim();
  if (input.imageId !== undefined) patch.imageId = input.imageId.trim();
  if (input.type !== undefined) {
    if (!VALID_TYPES.has(input.type)) throw new Error("INVALID_TYPE");
    patch.type = input.type;
  }

  await db.collection("sales_materials").doc(materialId).set(patch, { merge: true });
  const saved = await db.collection("sales_materials").doc(materialId).get();
  return normalizeMaterial(saved.id, saved.data() ?? {});
}

export async function deleteSalesMaterial(materialId: string): Promise<void> {
  const snap = await db.collection("sales_materials").doc(materialId).get();
  if (!snap.exists) throw new Error("NOT_FOUND");
  await db.collection("sales_materials").doc(materialId).delete();
}

export function assertAdmin(actor: SalesActor) {
  if (actor.role !== "admin") throw new Error("FORBIDDEN");
}
