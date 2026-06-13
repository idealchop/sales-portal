"use client";

import {
  CalendarDays,
  CreditCard,
  Droplets,
  MapPin,
  Package,
  PackageSearch,
  Phone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FirestoreActionsMenu } from "@/features/admin/components/firestore-actions-menu";
import {
  parseCustomerListRow,
  type CustomerListBadge,
} from "@/lib/admin/customer-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

function CustomerBadgeIcon({ tone }: { tone: CustomerListBadge["tone"] }) {
  switch (tone) {
    case "delivery":
      return <CalendarDays className="h-3 w-3" aria-hidden />;
    case "collection":
      return <PackageSearch className="h-3 w-3" aria-hidden />;
    case "pricing":
      return <Droplets className="h-3 w-3" aria-hidden />;
    case "assets":
      return <Package className="h-3 w-3" aria-hidden />;
    case "unpaid":
      return <CreditCard className="h-3 w-3" aria-hidden />;
    case "pending":
      return <PackageSearch className="h-3 w-3" aria-hidden />;
  }
}

function CustomerBadgeList({ badges }: { badges: CustomerListBadge[] }) {
  if (badges.length === 0) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
        No preferences set
      </span>
    );
  }

  return (
    <>
      {badges.map((badge) => (
        <Badge
          key={badge.key}
          className={cn(
            "h-6 gap-1.5 rounded-md px-2 text-[9px] font-semibold uppercase tracking-tight",
            badge.className,
          )}
        >
          <CustomerBadgeIcon tone={badge.tone} />
          {badge.label}
        </Badge>
      ))}
    </>
  );
}

export function BusinessCustomerListRow({
  doc,
  onView,
  onEdit,
  onRemove,
}: {
  doc: UserFirestoreDocumentRow;
  onView: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const customer = parseCustomerListRow(doc);

  return (
    <div className="flex items-start gap-3 border-b border-zinc-100 bg-white px-4 py-4 last:border-b-0 transition hover:bg-zinc-50/60">
      <button
        type="button"
        onClick={onView}
        className="grid min-w-0 flex-1 cursor-pointer gap-4 text-left lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center"
      >
        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-teal-50 text-sm font-bold uppercase tracking-tight text-teal-700 shadow-sm ring-1 ring-zinc-200/80">
            {customer.photoUrl ?
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={customer.photoUrl}
                alt={customer.name}
                className="h-full w-full object-cover"
              />
            : customer.initials}
          </div>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
              customer.isActive ? "bg-emerald-500" : "bg-zinc-300",
            )}
            aria-hidden
          />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {customer.name}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <Phone className="h-3 w-3 shrink-0 text-zinc-400" aria-hidden />
            <span className="truncate">{customer.phone}</span>
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-zinc-400">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-zinc-300" aria-hidden />
            <span className="line-clamp-2">{customer.address}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <CustomerBadgeList badges={customer.badges} />
        </div>
      </button>

      <FirestoreActionsMenu
        onView={onView}
        onEdit={onEdit}
        onRemove={onRemove}
      />
    </div>
  );
}
