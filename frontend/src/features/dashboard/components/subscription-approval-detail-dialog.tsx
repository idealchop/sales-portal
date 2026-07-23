"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink, FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  printSubscriptionOfficialReceipt,
  subscriptionEligibleForOfficialReceipt,
} from "@/features/dashboard/lib/subscription-official-receipt";
import type { OwnerSubscription } from "@/lib/dashboard/analytics";
import {
  formatBillingCycleLabel,
  formatDowngradeReason,
  formatPaymentStatus,
  formatSubscriptionPeriod,
  formatSubscriptionStatus,
  formatTrialDaysRemaining,
  isTrialBillingCycle,
} from "@/lib/dashboard/subscription-labels";
import {
  formatPaymentMethod,
  getSubscriptionAttachments,
} from "@/lib/dashboard/subscription-attachments";
import { formatPhp } from "@/lib/format";

function formatDate(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
      <p className="text-xs font-medium text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  );
}

function AttachmentPreview({
  url,
  label,
  kind,
}: {
  url: string;
  label: string;
  kind: "image" | "pdf" | "file";
}) {
  return (
    <div className="space-y-2 rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </a>
        </Button>
      </div>

      {kind === "image" ?
        <div className="relative aspect-[4/3] max-h-72 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <Image
            src={url}
            alt={label}
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      : kind === "pdf" ?
        <iframe
          title={label}
          src={url}
          className="h-72 w-full rounded-lg border border-zinc-200 bg-white"
        />
      : <div className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600">
          <FileText className="h-5 w-5 shrink-0 text-zinc-400" />
          <span>Preview not available for this file type.</span>
        </div>
      }
    </div>
  );
}

export function SubscriptionApprovalDetailDialog({
  subscription,
  businessId,
  businessName,
  ownerEmail,
  canApprove,
  isApproving,
  onApprove,
  onClose,
}: {
  subscription: OwnerSubscription | null;
  businessId?: string;
  businessName?: string;
  ownerEmail?: string;
  canApprove?: boolean;
  isApproving?: boolean;
  onApprove?: () => void;
  onClose: () => void;
}) {
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  useEffect(() => {
    if (!subscription) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [subscription, onClose]);

  if (!subscription) return null;

  const attachments = getSubscriptionAttachments(subscription);
  const showDowngrade =
    subscription.isDowngrade &&
    (subscription.downgradeReasonCode || subscription.downgradeReasonDetail);
  const showCancel = subscription.isCancellation;
  const canPrintOr =
    Boolean(businessId) && subscriptionEligibleForOfficialReceipt(subscription);

  async function handlePrintOr() {
    if (!businessId || !subscription) return;
    const subscriptionId = subscription.id;
    setPrintError(null);
    setPrinting(true);
    try {
      await printSubscriptionOfficialReceipt(businessId, subscriptionId);
    } catch (err) {
      setPrintError(
        err instanceof Error ?
          err.message
        : "Could not print Official Receipt.",
      );
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
              Subscription review
            </p>
            <h3 className="text-lg font-semibold text-foreground">
              {subscription.planName}
            </h3>
            {businessName ?
              <p className="text-sm text-[var(--muted-foreground)]">
                {businessName}
              </p>
            : null}
            {ownerEmail ?
              <p className="text-xs text-[var(--muted-foreground)]">
                {ownerEmail}
              </p>
            : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
          {subscription.needsApproval ?
            <Badge className="bg-amber-100 text-amber-800">
              Needs approval
            </Badge>
          : null}

          {showDowngrade ?
            <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-amber-900">
              {formatDowngradeReason(
                subscription.downgradeReasonCode,
                subscription.downgradeReasonDetail,
              )}
            </p>
          : null}

          {showCancel ?
            <div className="space-y-1 rounded-lg bg-rose-50 px-3 py-2.5 text-rose-900">
              <p>
                {subscription.cancelAtPeriodEnd ?
                  "Owner scheduled cancellation at period end."
                : "Subscription marked for cancellation."}
              </p>
              {subscription.expiresAt ?
                <p className="text-xs text-rose-800/80">
                  Access ends {formatDate(subscription.expiresAt)}
                </p>
              : null}
            </div>
          : null}

          <div className="grid grid-cols-2 gap-2">
            <DetailField
              label="Status"
              value={formatSubscriptionStatus(subscription.status)}
            />
            <DetailField
              label="Payment"
              value={formatPaymentStatus(subscription.paymentStatus)}
            />
            <DetailField
              label="Price"
              value={
                subscription.price > 0 ?
                  formatPhp(subscription.price)
                : "Free"
              }
            />
            <DetailField
              label="Billing"
              value={(() => {
                const label =
                  formatBillingCycleLabel(subscription.billingCycle) || "—";
                if (!isTrialBillingCycle(subscription.billingCycle)) {
                  return label;
                }
                const daysLeft = formatTrialDaysRemaining(subscription.expiresAt);
                return daysLeft ? `${label} · ${daysLeft}` : label;
              })()}
            />
            <DetailField
              label="Method"
              value={formatPaymentMethod(subscription.paymentMethod)}
            />
            <DetailField
              label="Period"
              value={formatSubscriptionPeriod(subscription)}
            />
          </div>

          {subscription.paymentReference ?
            <DetailField
              label="Payment reference"
              value={subscription.paymentReference}
            />
          : null}

          {attachments.length > 0 ?
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Attachments
              </p>
              {attachments.map((attachment) => (
                <AttachmentPreview
                  key={attachment.url}
                  url={attachment.url}
                  label={attachment.label}
                  kind={attachment.kind}
                />
              ))}
            </div>
          : <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-center text-xs text-[var(--muted-foreground)]">
              No payment receipt or file was attached to this subscription.
            </p>
          }
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          {printError ?
            <p className="mr-auto w-full text-sm text-red-600 sm:w-auto">
              {printError}
            </p>
          : null}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {canPrintOr ?
            <Button
              variant="outline"
              disabled={printing}
              onClick={() => void handlePrintOr()}
            >
              {printing ? "Preparing…" : "Print OR"}
            </Button>
          : null}
          {canApprove && onApprove ?
            <Button disabled={isApproving} onClick={onApprove}>
              {isApproving ? "Approving…" : "Approve"}
            </Button>
          : null}
        </div>
      </div>
    </div>
  );
}
