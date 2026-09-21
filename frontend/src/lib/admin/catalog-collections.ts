export const ADMIN_CATALOG_COLLECTIONS = {
  subscription_addons: {
    title: "Add-ons",
    description:
      "Extras stations can buy on top of a plan — more riders, more River AI, or another station. Each add-on shows how many live stations have it — open the count to see who.",
    route: "/subscriptions/addons",
    howItWorks: [
      "An add-on is not a plan. It is an extra a Grow or Scale station can purchase.",
      "Each row shows how many live stations currently have that add-on. Open the count to see who, when they started, and last active.",
      "Pick Extra rider, AI boost, or Additional business to fill the usual price, then change anything you need.",
      "Save makes it live in SmartRefill. No developer or IT step.",
    ],
  },
  vouchers_affiliates: {
    title: "Vouchers & affiliates",
    description:
      "Vouchers are checkout codes (percent off, pesos off, or extra trial days). Affiliates are partner referral codes and their commission. Each row shows how many live stations used that code — open the count to see who.",
    route: "/subscriptions/vouchers-affiliates",
    howItWorks: [
      "A voucher is what a station types at checkout. Use percent off, pesos off (including ₱0), or extra trial days.",
      "An affiliate is a partner code. When a station signs up with it, the partner earns the commission you set.",
      "Lead pipeline Referrals pick from these affiliates. Insights and this page show success rate plus who still needs a partner code or checkout voucher.",
      "Onboarded/account-ready referrals count toward payout even if they did not type the code at checkout. Paying Starter–Scale stations get the affiliate stamped on their subscription.",
      "Each row shows how many live stations currently used that voucher or came through that partner. Open the count to see who, when they started, and last active.",
      "Save makes the code live in SmartRefill. No developer or IT step.",
    ],
  },
  subscription_plans: {
    title: "Plan management",
    description:
      "Set prices and limits stations see. Each plan shows how many live stations use it — open the count to see who. Always keep Free (₱0) so the trial has somewhere to land.",
    route: "/subscriptions/plans",
  },
  subscription_trial_policy: {
    title: "Free trial",
    description:
      "This is not a pricing card. It is the trial new stations get at signup. See who is on trial now and how many days they have left. When it ends without payment they move to Free.",
    route: "/subscriptions/trial",
  },
  product_icons: {
    title: "Product icons",
    description: "Icons stations assign to delivery products. This belongs in SmartRefill config, not subscriptions.",
    route: "/webapp/smartrefill",
  },
} as const;

export type AdminCatalogCollectionId = keyof typeof ADMIN_CATALOG_COLLECTIONS;

export const VERSIONED_CATALOG_COLLECTIONS: AdminCatalogCollectionId[] = [
  "subscription_plans",
  "subscription_trial_policy",
];

export function isVersionedCatalogCollection(
  collectionId: AdminCatalogCollectionId,
): boolean {
  return VERSIONED_CATALOG_COLLECTIONS.includes(collectionId);
}

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

export function catalogDocumentIsWaterContainer(data: Record<string, unknown>): boolean {
  return data.waterContainer === true;
}
