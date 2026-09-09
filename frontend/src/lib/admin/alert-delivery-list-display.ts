import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { humanizeFieldKey } from "@/lib/admin/user-profile-display";

export type ParsedAlertDeliveryListRow = {
  categoryLabel: string;
  channelLabel: string;
  channelClassName: string;
  statusLabel: string;
  statusClassName: string;
  audienceLabel: string;
  countsLabel: string;
  timestampLabel: string;
  detailSummary: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  new_order_push: "New order push",
  customer_txn_status: "Customer status update",
  customer_payment_update: "Customer payment update",
  portal_completion_receipt: "Completion receipt",
  portal_order_received: "Order received email",
  customer_txn_sms: "Customer SMS",
  proactive_push: "Daily insight push",
  pending_submission_reminder: "Pending portal reminder",
  morning_brief_email: "Morning brief email",
  dormant_email: "Inactive suki email",
  payment_reminder_email: "Payment reminder email",
  maintenance_overdue_email: "Maintenance overdue email",
  weekly_performance_email: "Weekly performance email",
  subscription_lifecycle_email: "Subscription email",
  production_variance_email: "Production variance email",
  low_stock_digest_email: "Low stock email",
  team_digest_email: "Team activity email",
  plant_alerts: "Plant alert",
};

function readString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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

function formatTimestamp(value: unknown): string {
  const ms = timestampMs(value);
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function alertDeliveryCategoryLabel(
  category: string,
  audience?: string,
): string {
  const trimmed = category.trim();
  if (!trimmed) {
    return audience === "customer" ? "Customer email" : "Station alert";
  }
  if (CATEGORY_LABELS[trimmed]) return CATEGORY_LABELS[trimmed];
  if (trimmed.startsWith("txn_")) {
    return `Order ${trimmed.replace("txn_", "").replace(/_/g, " ")}`;
  }
  return humanizeFieldKey(trimmed);
}

function channelMeta(channel: string): { label: string; className: string } {
  switch (channel.toLowerCase()) {
    case "push":
      return {
        label: "Push",
        className: "border-sky-200 bg-sky-50 text-sky-800",
      };
    case "sms":
      return {
        label: "SMS",
        className: "border-violet-200 bg-violet-50 text-violet-800",
      };
    case "email":
      return {
        label: "Email",
        className: "border-teal-200 bg-teal-50 text-teal-800",
      };
    default:
      return {
        label: channel ? humanizeFieldKey(channel) : "—",
        className: "border-zinc-200 bg-zinc-50 text-zinc-700",
      };
  }
}

function statusMeta(status: string): { label: string; className: string } {
  switch (status.toLowerCase()) {
    case "sent":
      return {
        label: "Sent",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    case "partial":
      return {
        label: "Partial",
        className: "border-amber-200 bg-amber-50 text-amber-800",
      };
    case "failed":
      return {
        label: "Failed",
        className: "border-red-200 bg-red-50 text-red-800",
      };
    case "skipped":
      return {
        label: "Skipped",
        className: "border-zinc-200 bg-zinc-50 text-zinc-700",
      };
    default:
      return {
        label: status ? humanizeFieldKey(status) : "—",
        className: "border-zinc-200 bg-zinc-50 text-zinc-700",
      };
  }
}

function formatCounts(data: Record<string, unknown>): string {
  const channel = readString(data.channel).toLowerCase();
  const recipientCount = readNumber(data.recipientCount);
  const successCount = readNumber(data.successCount);
  const failureCount = readNumber(data.failureCount);
  const status = readString(data.status).toLowerCase();

  if (channel === "push" && recipientCount != null) {
    const ok = successCount ?? 0;
    const total = recipientCount;
    if (status === "partial" || (failureCount && failureCount > 0)) {
      return `${ok}/${total} devices`;
    }
    return total === 1 ? "1 device" : `${total} devices`;
  }

  if (recipientCount === 1) return "1 recipient";
  if (recipientCount != null && recipientCount > 1) {
    return `${recipientCount} recipients`;
  }
  if (successCount != null || failureCount != null) {
    return `${successCount ?? 0} ok · ${failureCount ?? 0} failed`;
  }
  return "—";
}

function detailSummary(data: Record<string, unknown>): string {
  const detail = data.detail;
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return "";
  const record = detail as Record<string, unknown>;
  const parts = [
    readString(record.toEmail),
    readString(record.customerId),
    readString(record.referenceId),
    readString(record.orderId),
  ].filter(Boolean);
  return parts.slice(0, 2).join(" · ");
}

export function parseAlertDeliveryListRow(
  doc: UserFirestoreDocumentRow,
): ParsedAlertDeliveryListRow {
  const channel = readString(doc.data.channel);
  const category = readString(doc.data.category);
  const status = readString(doc.data.status);
  const audience = readString(doc.data.audience);
  const channelInfo = channelMeta(channel);
  const statusInfo = statusMeta(status);

  return {
    categoryLabel: alertDeliveryCategoryLabel(category, audience),
    channelLabel: channelInfo.label,
    channelClassName: channelInfo.className,
    statusLabel: statusInfo.label,
    statusClassName: statusInfo.className,
    audienceLabel: audience ? humanizeFieldKey(audience) : "—",
    countsLabel: formatCounts(doc.data),
    timestampLabel: formatTimestamp(doc.data.createdAt),
    detailSummary: detailSummary(doc.data),
  };
}

export function alertDeliverySearchText(doc: UserFirestoreDocumentRow): string {
  const row = parseAlertDeliveryListRow(doc);
  return [
    doc.documentId,
    doc.path,
    row.categoryLabel,
    row.channelLabel,
    row.statusLabel,
    row.audienceLabel,
    row.countsLabel,
    row.detailSummary,
    readString(doc.data.category),
    readString(doc.data.channel),
    readString(doc.data.status),
  ]
    .join(" ")
    .toLowerCase();
}

export function sortAlertDeliveryDocuments(
  documents: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...documents].sort(
    (a, b) => timestampMs(b.data.createdAt) - timestampMs(a.data.createdAt),
  );
}

export function matchesAlertDeliveryFilter(
  doc: UserFirestoreDocumentRow,
  filter: string,
): boolean {
  if (filter === "all") return true;
  if (filter.startsWith("channel:")) {
    return (
      readString(doc.data.channel).toLowerCase() ===
      filter.slice("channel:".length)
    );
  }
  if (filter.startsWith("status:")) {
    return (
      readString(doc.data.status).toLowerCase() ===
      filter.slice("status:".length)
    );
  }
  return true;
}
