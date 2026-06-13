import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { humanizeFieldKey } from "@/lib/admin/user-profile-display";

export type PaymentAccountType =
  | "bank_transfer"
  | "credit_card"
  | "digital_wallet";

export type ParsedPaymentInfoListRow = {
  displayName: string;
  paymentTypeLabel: string;
  accountNumber: string;
  qrCodeUrl?: string;
  isPrimary: boolean;
  bankName: string;
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  bank_transfer: "Bank",
  credit_card: "Credit Card",
  digital_wallet: "Digital Wallet",
};

function readString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function paymentInfoTypeLabel(type: unknown): string {
  const key = readString(type) || "bank_transfer";
  return PAYMENT_TYPE_LABELS[key] ?? humanizeFieldKey(key);
}

export function parsePaymentInfoListRow(
  doc: UserFirestoreDocumentRow,
): ParsedPaymentInfoListRow {
  const data = doc.data;
  const accountName = readString(data.accountName);
  const bankName = readString(data.bankName);
  const qrCode = readString(data.qrCode);

  return {
    displayName: accountName || bankName || doc.documentId,
    paymentTypeLabel: paymentInfoTypeLabel(data.type),
    accountNumber: readString(data.accountNumber) || "—",
    qrCodeUrl: qrCode || undefined,
    isPrimary: data.isPrimary === true,
    bankName,
  };
}

export function sortPaymentInfoDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...documents].sort((a, b) => {
    const aPrimary = a.data.isPrimary === true ? 1 : 0;
    const bPrimary = b.data.isPrimary === true ? 1 : 0;
    if (aPrimary !== bPrimary) return bPrimary - aPrimary;

    const aName =
      readString(a.data.accountName) ||
      readString(a.data.bankName) ||
      a.documentId;
    const bName =
      readString(b.data.accountName) ||
      readString(b.data.bankName) ||
      b.documentId;
    return aName.localeCompare(bName);
  });
}

export function paymentInfoSearchText(doc: UserFirestoreDocumentRow): string {
  const row = parsePaymentInfoListRow(doc);
  return [
    row.displayName,
    row.bankName,
    row.paymentTypeLabel,
    row.accountNumber,
    readString(doc.data.type),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
