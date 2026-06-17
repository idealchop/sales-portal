import type { OwnerSubscription } from "@/lib/dashboard/analytics";

export type SubscriptionAttachmentKind = "image" | "pdf" | "file";

export type SubscriptionAttachment = {
  url: string;
  label: string;
  kind: SubscriptionAttachmentKind;
};

export function classifyAttachmentUrl(url: string): SubscriptionAttachmentKind {
  const lower = url.toLowerCase().split("?")[0] ?? "";
  if (lower.startsWith("data:image/")) return "image";
  if (
    lower.startsWith("data:application/pdf") ||
    lower.endsWith(".pdf")
  ) {
    return "pdf";
  }
  if (/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(lower)) {
    return "image";
  }
  return "file";
}

export function getSubscriptionAttachments(
  subscription: OwnerSubscription,
): SubscriptionAttachment[] {
  const items: SubscriptionAttachment[] = [];
  const seen = new Set<string>();

  function push(url: string | undefined, label: string) {
    if (!url || seen.has(url)) return;
    seen.add(url);
    items.push({
      url,
      label,
      kind: classifyAttachmentUrl(url),
    });
  }

  push(subscription.receiptUrl, "Payment receipt");
  push(subscription.attachmentUrl, "Payment attachment");

  return items;
}

export function formatPaymentMethod(method?: string): string {
  if (!method) return "—";
  const labels: Record<string, string> = {
    gcash: "GCash",
    maya: "Maya",
    card: "Card",
    bank_transfer: "Bank transfer",
  };
  return labels[method] ?? method.replaceAll("_", " ");
}
