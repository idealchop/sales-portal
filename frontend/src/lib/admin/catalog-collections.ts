export const ADMIN_CATALOG_COLLECTIONS = {
  subscription_addons: {
    title: "Addons management",
    description: "Manage subscription add-ons available to Smart Refill businesses.",
    route: "/subscriptions/addons",
  },
  vouchers_affiliates: {
    title: "Voucher & affiliates management",
    description: "Manage vouchers, affiliate codes, and related promotions.",
    route: "/subscriptions/vouchers-affiliates",
  },
  subscription_plans: {
    title: "Plan management",
    description: "Manage subscription plans, pricing tiers, and billing options.",
    route: "/subscriptions/plans",
  },
} as const;

export type AdminCatalogCollectionId = keyof typeof ADMIN_CATALOG_COLLECTIONS;

export function isAdminCatalogCollectionId(
  value: string,
): value is AdminCatalogCollectionId {
  return Object.prototype.hasOwnProperty.call(ADMIN_CATALOG_COLLECTIONS, value);
}

export function catalogDocumentDisplayName(data: Record<string, unknown>, documentId: string): string {
  if (typeof data.name === "string" && data.name.trim()) {
    return data.name.trim();
  }
  if (typeof data.code === "string" && data.code.trim()) {
    return data.code.trim();
  }
  return documentId;
}

export function catalogDocumentSubtitle(data: Record<string, unknown>): string | undefined {
  if (typeof data.code === "string" && data.code.trim()) {
    return data.code.trim();
  }
  if (typeof data.type === "string" && data.type.trim()) {
    return data.type.trim();
  }
  return undefined;
}

export function catalogDocumentActive(data: Record<string, unknown>): boolean | undefined {
  if (typeof data.active === "boolean") return data.active;
  if (typeof data.isActive === "boolean") return data.isActive;
  if (typeof data.enabled === "boolean") return data.enabled;
  return undefined;
}
