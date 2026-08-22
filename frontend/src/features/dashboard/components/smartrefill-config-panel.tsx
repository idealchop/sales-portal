"use client";

import Link from "next/link";
import { ArrowUpRight, ImageIcon, Layers, Package, Ticket } from "lucide-react";
import { useState } from "react";
import { AdminCatalogCollectionManager } from "@/features/admin/components/admin-catalog-collection-manager";
import {
  DashboardSegmentTabs,
  type DashboardSegmentTab,
} from "@/features/dashboard/components/dashboard-segment-tabs";
import { ADMIN_CATALOG_COLLECTIONS } from "@/lib/admin/catalog-collections";

type SmartRefillConfigSection = "product_icons" | "more";

const MORE_SETTINGS = [
  {
    href: "/subscriptions/plans",
    label: "Plan management",
    description: ADMIN_CATALOG_COLLECTIONS.subscription_plans.description,
    icon: Layers,
  },
  {
    href: "/subscriptions/addons",
    label: "Addons management",
    description: ADMIN_CATALOG_COLLECTIONS.subscription_addons.description,
    icon: Package,
  },
  {
    href: "/subscriptions/vouchers-affiliates",
    label: "Vouchers & affiliates",
    description: ADMIN_CATALOG_COLLECTIONS.vouchers_affiliates.description,
    icon: Ticket,
  },
] as const;

export function SmartRefillConfigPanel() {
  const [section, setSection] = useState<SmartRefillConfigSection>("product_icons");

  const tabs: DashboardSegmentTab[] = [
    { id: "product_icons", label: "Product icons" },
    { id: "more", label: "More settings" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">App configuration</h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Manage SmartRefill product settings. Icons here appear in the station
          product picker when assigning delivery products.
        </p>
      </div>

      <DashboardSegmentTabs
        tabs={tabs}
        activeId={section}
        onChange={(id) => setSection(id as SmartRefillConfigSection)}
      />

      {section === "product_icons" ?
        <AdminCatalogCollectionManager
          collectionId="product_icons"
          enabled
          compact
        />
      : <div className="grid gap-3 sm:grid-cols-2">
          {MORE_SETTINGS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-xl border border-[var(--border)] bg-white p-4 transition hover:border-teal-200 hover:bg-teal-50/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-teal-50 p-2 text-teal-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:text-teal-700" />
                </div>
              </Link>
            );
          })}
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-zinc-50/60 p-4 sm:col-span-2">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white p-2 text-zinc-500 ring-1 ring-zinc-200">
                <ImageIcon className="h-4 w-4" />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Product icons are edited on this tab. Plans, add-ons, and vouchers
                open in the Subscriptions section for full catalog editing.
              </p>
            </div>
          </div>
        </div>
      }
    </div>
  );
}
