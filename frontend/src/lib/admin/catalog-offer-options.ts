import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export type CatalogOfferKind = "voucher" | "affiliate";

export type CatalogOfferOption = {
  documentId: string;
  kind: CatalogOfferKind;
  code: string;
  name: string;
  isActive: boolean;
  ownerUserId?: string;
  contactEmail?: string;
};

function readTrimmed(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.trim();
}

export function parseCatalogOfferOptions(
  documents: UserFirestoreDocumentRow[],
): CatalogOfferOption[] {
  const rows: CatalogOfferOption[] = [];
  for (const doc of documents) {
    const kind =
      String(doc.data.kind || "voucher") === "affiliate" ? "affiliate" : "voucher";
    const code = readTrimmed(doc.data.code) || "";
    const name =
      readTrimmed(doc.data.name) || code || doc.documentId;
    rows.push({
      documentId: doc.documentId,
      kind,
      code,
      name,
      isActive: doc.data.isActive !== false,
      ownerUserId: readTrimmed(doc.data.ownerUserId),
      contactEmail: readTrimmed(doc.data.contactEmail)?.toLowerCase(),
    });
  }
  return rows.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export function catalogAffiliates(
  documents: UserFirestoreDocumentRow[],
): CatalogOfferOption[] {
  return parseCatalogOfferOptions(documents).filter(
    (row) => row.kind === "affiliate",
  );
}
