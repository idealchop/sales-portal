"use client";

import Link from "next/link";
import { SalesHomeHighlightLink } from "@/features/dashboard/components/lead-action-board-list";
import type {
  SalesHomeNewUserBadge,
  SalesHomeRouteShortcut,
} from "@/features/dashboard/lib/build-sales-home-highlights";

export function SalesHomeRouteShortcuts({
  items,
  newUserBadges = [],
}: {
  items: SalesHomeRouteShortcut[];
  newUserBadges?: SalesHomeNewUserBadge[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {newUserBadges.length > 0 ?
        <div className="flex flex-wrap gap-2">
          {newUserBadges.map((badge) => (
            <Link
              key={badge.appId}
              href={badge.href}
              className="inline-flex items-center rounded-full bg-teal-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-teal-800"
            >
              {badge.count} new in {badge.appLabel}
            </Link>
          ))}
        </div>
      : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <SalesHomeHighlightLink key={item.id} {...item} />
        ))}
      </div>
    </div>
  );
}
