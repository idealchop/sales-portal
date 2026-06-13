import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export type CustomerDeliveryConfig = {
  frequency?: string;
  preferredDays?: number[];
  preferredTime?: string;
};

export type CustomerCollectionConfig = {
  frequency?: string;
  preferredDays?: number[];
  preferredTime?: string;
};

export type CustomerPossessionEntry = {
  itemName: string;
  quantity: number;
};

export type ParsedCustomerListRow = {
  name: string;
  phone: string;
  address: string;
  photoUrl?: string;
  initials: string;
  isActive: boolean;
  badges: CustomerListBadge[];
};

export type CustomerListBadge = {
  key: string;
  label: string;
  className: string;
  tone: "delivery" | "collection" | "pricing" | "assets" | "unpaid" | "pending";
};

function readString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ?
      (value as Record<string, unknown>)
    : {};
}

function readConfig(value: unknown): CustomerDeliveryConfig | undefined {
  const record = readRecord(value);
  if (Object.keys(record).length === 0) return undefined;
  return {
    frequency: readString(record.frequency) || undefined,
    preferredDays: Array.isArray(record.preferredDays) ?
        record.preferredDays.filter((day): day is number => typeof day === "number")
      : undefined,
    preferredTime: readString(record.preferredTime) || undefined,
  };
}

export function customerInitials(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "CU";
  return parts
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function parseCustomerListRow(
  doc: UserFirestoreDocumentRow,
): ParsedCustomerListRow {
  const data = doc.data;
  const name = readString(data.name) || doc.documentId;
  const phone = readString(data.phone);
  const address = readString(data.address) || "Location unspecified";
  const status = readString(data.status).toLowerCase();
  const isActive = status !== "inactive";

  const isDeliveryEnabled = data.isDeliveryEnabled === true;
  const isCollectionEnabled = data.isCollectionEnabled === true;
  const deliveryConfig = readConfig(data.deliveryConfig);
  const collectionConfig = readConfig(data.collectionConfig);
  const pricing = readRecord(data.pricing);
  const possession = readRecord(data.possession);
  const hasCustomPricing = Object.keys(pricing).length > 0;
  const hasPossession = Object.keys(possession).length > 0;
  const hasBalance = data.hasBalance === true;

  const badges: CustomerListBadge[] = [];

  if (isDeliveryEnabled && deliveryConfig?.frequency) {
    badges.push({
      key: "delivery",
      label: deliveryConfig.frequency,
      tone: "delivery",
      className:
        "border-blue-100/80 bg-blue-50/80 text-blue-600",
    });
  }

  if (isCollectionEnabled && collectionConfig?.frequency) {
    badges.push({
      key: "collection",
      label: collectionConfig.frequency,
      tone: "collection",
      className:
        "border-emerald-100/80 bg-emerald-50/80 text-emerald-600",
    });
  }

  if (hasCustomPricing) {
    badges.push({
      key: "pricing",
      label: "VIP Rates",
      tone: "pricing",
      className:
        "border-amber-100/80 bg-amber-50/80 text-amber-600",
    });
  }

  if (hasPossession) {
    badges.push({
      key: "assets",
      label: "Assets",
      tone: "assets",
      className:
        "border-indigo-100/80 bg-indigo-50/80 text-indigo-600",
    });
  }

  if (hasBalance) {
    badges.push({
      key: "unpaid",
      label: "Unpaid",
      tone: "unpaid",
      className: "border-rose-100/80 bg-rose-50/80 text-rose-600",
    });
  }

  if (data.hasPendingOrder === true) {
    badges.push({
      key: "pending-order",
      label: "Pending Order",
      tone: "pending",
      className:
        "border-amber-100/80 bg-amber-50/80 text-amber-600",
    });
  }

  return {
    name,
    phone: phone || "—",
    address,
    photoUrl:
      typeof data.photoUrl === "string" && data.photoUrl.trim() ?
        data.photoUrl.trim()
      : undefined,
    initials: customerInitials(name),
    isActive,
    badges,
  };
}

export function sortCustomerDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...documents].sort((a, b) => {
    const nameA = readString(a.data.name) || a.documentId;
    const nameB = readString(b.data.name) || b.documentId;
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatCustomerPreferredDays(days?: number[]): string {
  if (!days?.length) return "Any day";
  return days.map((day) => DAY_LABELS[day % 7]).join(", ");
}

export function formatCustomerWaterLabel(waterTypeId: string): string {
  return waterTypeId
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export type ParsedCustomerProfile = {
  name: string;
  phone: string;
  address: string;
  photoUrl?: string;
  initials: string;
  customerType: string;
  isDeliveryEnabled: boolean;
  isCollectionEnabled: boolean;
  deliveryConfig?: CustomerDeliveryConfig;
  collectionConfig?: CustomerCollectionConfig;
  possessionRows: Array<{ id: string; itemName: string; quantity: number }>;
  pricingRows: Array<{ waterTypeId: string; price: number }>;
  notes?: string;
};

export function parseCustomerProfile(
  doc: UserFirestoreDocumentRow,
): ParsedCustomerProfile {
  const data = doc.data;
  const name = readString(data.name) || doc.documentId;
  const pricing = readRecord(data.pricing);
  const possession = readRecord(data.possession);

  return {
    name,
    phone: readString(data.phone) || "—",
    address: readString(data.address) || "Location unspecified",
    photoUrl:
      typeof data.photoUrl === "string" && data.photoUrl.trim() ?
        data.photoUrl.trim()
      : undefined,
    initials: customerInitials(name),
    customerType:
      readString(data.type) ?
        readString(data.type).charAt(0).toUpperCase() +
        readString(data.type).slice(1)
      : "Customer",
    isDeliveryEnabled: data.isDeliveryEnabled === true,
    isCollectionEnabled: data.isCollectionEnabled === true,
    deliveryConfig: readConfig(data.deliveryConfig),
    collectionConfig: readConfig(data.collectionConfig),
    possessionRows: Object.entries(possession)
      .map(([id, value]) => {
        const row = readRecord(value);
        return {
          id,
          itemName: readString(row.itemName) || "Container",
          quantity: Number(row.quantity) || 0,
        };
      })
      .filter((row) => row.quantity > 0),
    pricingRows: Object.entries(pricing).map(([waterTypeId, price]) => ({
      waterTypeId,
      price: Number(price) || 0,
    })),
    notes: readString(data.notes) || undefined,
  };
}

function timestampMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    const seconds = Number((value as { _seconds?: number })._seconds);
    return Number.isFinite(seconds) ? seconds * 1000 : 0;
  }
  return 0;
}

export type ParsedCustomerTransactionRow = {
  reference: string;
  type: string;
  dateLabel: string;
  amountLabel: string;
  paymentStatus: string;
  paymentBadgeClass: string;
};

export function parseCustomerTransactionRow(
  doc: UserFirestoreDocumentRow,
): ParsedCustomerTransactionRow {
  const data = doc.data;
  const paymentStatus = readString(data.paymentStatus).toLowerCase() || "unknown";
  const amount = Number(data.totalAmount) || 0;
  const dateValue = data.createdAt ?? data.deliveredAt ?? data.scheduledAt;

  let paymentBadgeClass = "border-zinc-200 bg-zinc-100 text-zinc-700";
  if (paymentStatus === "paid" || paymentStatus === "verified") {
    paymentBadgeClass = "border-emerald-200 bg-emerald-50 text-emerald-700";
  } else if (paymentStatus === "partial") {
    paymentBadgeClass = "border-amber-200 bg-amber-50 text-amber-700";
  } else if (paymentStatus === "unpaid") {
    paymentBadgeClass = "border-rose-200 bg-rose-50 text-rose-700";
  }

  return {
    reference: readString(data.referenceId) || doc.documentId,
    type: readString(data.type) || "transaction",
    dateLabel:
      timestampMs(dateValue) ?
        new Date(timestampMs(dateValue)).toLocaleDateString("en-PH", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })
      : "—",
    amountLabel: `₱${amount.toLocaleString("en-PH")}`,
    paymentStatus: paymentStatus.replaceAll("_", " "),
    paymentBadgeClass,
  };
}

export function customerTransactionsForCustomer(
  documents: UserFirestoreDocumentRow[],
  customerId: string,
): UserFirestoreDocumentRow[] {
  return documents
    .filter(
      (doc) =>
        doc.collectionId === "transactions" &&
        readString(doc.data.customerId) === customerId,
    )
    .sort(
      (a, b) =>
        timestampMs(b.data.createdAt) - timestampMs(a.data.createdAt),
    );
}
