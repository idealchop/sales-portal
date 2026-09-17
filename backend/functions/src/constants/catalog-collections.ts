export const ADMIN_CATALOG_COLLECTIONS = {
  subscription_addons: {
    title: "Addons management",
    description: "Manage subscription add-ons available to Smart Refill businesses.",
  },
  vouchers_affiliates: {
    title: "Voucher & affiliates management",
    description: "Manage vouchers, affiliate codes, and related promotions.",
  },
  subscription_plans: {
    title: "Plan management",
    description: "Manage subscription plans, pricing tiers, and billing options.",
  },
  product_icons: {
    title: "Product icons",
    description: "Icons stations can assign to delivery products in SmartRefill. Mark water-container artwork (gallons and bottles) so it can be distinguished from other icons.",
  },
} as const;

export type AdminCatalogCollectionId = keyof typeof ADMIN_CATALOG_COLLECTIONS;

export function isAdminCatalogCollectionId(
  value: string,
): value is AdminCatalogCollectionId {
  return Object.prototype.hasOwnProperty.call(ADMIN_CATALOG_COLLECTIONS, value);
}
