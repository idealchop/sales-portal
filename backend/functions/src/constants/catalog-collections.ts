export const ADMIN_CATALOG_COLLECTIONS = {
  subscription_addons: {
    title: "Add-ons",
    description:
      "Extras stations can buy on top of a plan — more riders, more River AI, or another station. Each add-on shows how many live stations have it — open the count to see who.",
  },
  vouchers_affiliates: {
    title: "Vouchers & affiliates",
    description:
      "Vouchers are checkout codes (percent off, pesos off, or extra trial days). Affiliates are partner referral codes and their commission. Each row shows how many live stations used that code — open the count to see who.",
  },
  subscription_plans: {
    title: "Plan management",
    description:
      "Set prices and limits stations see. Always keep Free (₱0) so the trial has somewhere to land. Publish when you are ready — no developer or IT step.",
  },
  subscription_trial_policy: {
    title: "Free trial",
    description:
      "This is not a pricing card. It is the trial new stations get at signup. When it ends without payment they move to Free.",
  },
  product_icons: {
    title: "Product icons",
    description:
      "Icons stations assign to delivery products. Edit these in SmartRefill config, not under Subscriptions.",
  },
} as const;

export type AdminCatalogCollectionId = keyof typeof ADMIN_CATALOG_COLLECTIONS;

export function isAdminCatalogCollectionId(
  value: string,
): value is AdminCatalogCollectionId {
  return Object.prototype.hasOwnProperty.call(ADMIN_CATALOG_COLLECTIONS, value);
}
