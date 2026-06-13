"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OwnerSubscription } from "@/lib/dashboard/analytics";
import {
  formatDowngradeReason,
  formatPaymentStatus,
  formatSubscriptionStatus,
} from "@/lib/dashboard/subscription-labels";
import { formatPhp } from "@/lib/format";

function formatDate(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SubscriptionReasonDialog({
  subscription,
  businessName,
  onClose,
}: {
  subscription: OwnerSubscription | null;
  businessName?: string;
  onClose: () => void;
}) {
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

  const isDowngrade = subscription.isDowngrade;
  const isCancel = subscription.isCancellation;

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
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
              {isDowngrade ? "Downgrade reason" : "Cancellation details"}
            </p>
            <h3 className="text-lg font-semibold text-foreground">
              {subscription.planName}
            </h3>
            {businessName && (
              <p className="text-sm text-[var(--muted-foreground)]">{businessName}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 px-5 py-4 text-sm">
          {isDowngrade && (
            <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-amber-900">
              {formatDowngradeReason(
                subscription.downgradeReasonCode,
                subscription.downgradeReasonDetail,
              )}
            </p>
          )}

          {isCancel && (
            <div className="space-y-2 rounded-lg bg-rose-50 px-3 py-2.5 text-rose-900">
              <p>
                {subscription.cancelAtPeriodEnd ?
                  "Owner scheduled cancellation at period end."
                : "Subscription marked for cancellation."}
              </p>
              {subscription.expiresAt && (
                <p className="text-xs text-rose-800/80">
                  Access ends {formatDate(subscription.expiresAt)}
                </p>
              )}
              {!isDowngrade && (
                <p className="text-xs text-rose-800/70">
                  No written reason was saved for this cancellation.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs text-[var(--muted-foreground)]">
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
              <p className="font-medium text-foreground">Status</p>
              <p>{formatSubscriptionStatus(subscription.status)}</p>
            </div>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
              <p className="font-medium text-foreground">Payment</p>
              <p>{formatPaymentStatus(subscription.paymentStatus)}</p>
            </div>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
              <p className="font-medium text-foreground">Price</p>
              <p>{subscription.price > 0 ? formatPhp(subscription.price) : "Free"}</p>
            </div>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
              <p className="font-medium text-foreground">Billing</p>
              <p>{subscription.billingCycle || "—"}</p>
            </div>
          </div>

          {subscription.paymentReference && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Ref: {subscription.paymentReference}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
