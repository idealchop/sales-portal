import {
  resolveMemberStaffSubRole,
} from "../constants/smartrefill";

export type BusinessPlanTier = "scale" | "grow" | "starter" | "free";

export type BusinessTierCounts = Record<BusinessPlanTier, number>;

export type VirtualStaffCounts = {
  admins: number;
  riders: number;
};

export type CustomerStatusBreakdown = {
  active: number;
  deactivated: number;
};

export type TransactionBreakdown = {
  walkIn: number;
  directSale: number;
  orders: number;
};

export type ContainerInventoryBreakdown = {
  shell: number;
  round: number;
  slim: number;
};

export type InventoryBreakdown = {
  generalStock: number;
  kit: number;
  container: ContainerInventoryBreakdown;
};

export type InventoryItemRole =
  | "container_shell"
  | "container_round"
  | "container_slim"
  | "kit_component"
  | "general";

export function emptyTransactionBreakdown(): TransactionBreakdown {
  return { walkIn: 0, directSale: 0, orders: 0 };
}

export function sumTransactionBreakdown(breakdown: TransactionBreakdown): number {
  return breakdown.walkIn + breakdown.directSale + breakdown.orders;
}

export function emptyInventoryBreakdown(): InventoryBreakdown {
  return {
    generalStock: 0,
    kit: 0,
    container: { shell: 0, round: 0, slim: 0 },
  };
}

export function sumInventoryBreakdown(breakdown: InventoryBreakdown): number {
  return (
    breakdown.generalStock +
    breakdown.kit +
    breakdown.container.shell +
    breakdown.container.round +
    breakdown.container.slim
  );
}

function isContainerInventoryName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes("container") ||
    lower.includes("bottle") ||
    lower.includes("slim") ||
    lower.includes("round") ||
    lower.includes("gallon")
  );
}

export function normalizeInventoryItemRole(value: unknown): InventoryItemRole {
  if (
    value === "container_shell" ||
    value === "container_round" ||
    value === "container_slim" ||
    value === "kit_component"
  ) {
    return value;
  }
  return "general";
}

/** Aligns with SmartRefill `inventoryRole` on `businesses/{id}/inventory_items`. */
export function resolveInventoryItemRole(
  name: string,
  explicit?: unknown,
): InventoryItemRole {
  const normalized = normalizeInventoryItemRole(explicit);
  if (normalized !== "general") return normalized;

  const lower = name.toLowerCase();
  if (lower.includes("slim") && isContainerInventoryName(name)) return "container_slim";
  if (lower.includes("round") && isContainerInventoryName(name)) return "container_round";
  if (isContainerInventoryName(name)) return "container_shell";
  return "general";
}

export function readInventoryStockCurrent(
  data: FirebaseFirestore.DocumentData,
): number {
  const stock = data.stock;
  if (stock && typeof stock === "object" && !Array.isArray(stock)) {
    const current = Number((stock as { current?: unknown }).current);
    return Number.isFinite(current) && current > 0 ? current : 0;
  }
  return 0;
}

export function aggregatePlatformInventory(
  inventorySnap: FirebaseFirestore.QuerySnapshot,
): InventoryBreakdown {
  const breakdown = emptyInventoryBreakdown();

  for (const doc of inventorySnap.docs) {
    const data = doc.data();
    const qty = readInventoryStockCurrent(data);
    if (qty <= 0) continue;

    const name = typeof data.name === "string" ? data.name.trim() : doc.id;
    const role = resolveInventoryItemRole(name, data.inventoryRole);

    if (role === "kit_component") {
      breakdown.kit += qty;
    } else if (role === "container_shell") {
      breakdown.container.shell += qty;
    } else if (role === "container_round") {
      breakdown.container.round += qty;
    } else if (role === "container_slim") {
      breakdown.container.slim += qty;
    } else {
      breakdown.generalStock += qty;
    }
  }

  return breakdown;
}

export function emptyBusinessTierCounts(): BusinessTierCounts {
  return { scale: 0, grow: 0, starter: 0, free: 0 };
}

export function classifyBusinessTier(
  planName?: string,
  planCode?: string,
  subscriptionStatus?: string,
): BusinessPlanTier {
  const hasActiveSub = subscriptionStatus === "active";
  const key = `${planCode || ""} ${planName || ""}`.trim().toLowerCase();

  if (!hasActiveSub || !key || key.includes("free")) return "free";
  if (key.includes("scale")) return "scale";
  if (key.includes("growth") || key.includes("grow")) return "grow";
  if (key.includes("starter")) return "starter";
  return "free";
}

export function staffRecordHasLinkedUserAccount(
  recordId: string,
  recordData: FirebaseFirestore.DocumentData,
  usersById: Set<string>,
): boolean {
  const linkedUserId =
    typeof recordData.userId === "string" && recordData.userId.trim() ?
      recordData.userId.trim() :
      recordId;
  return usersById.has(linkedUserId);
}

/** Counts no-login staff records from `businesses/{id}/riders/{riderId}`. */
export function countVirtualStaffRecords(
  ridersSnap: FirebaseFirestore.QuerySnapshot,
  businessById: Map<string, { ownerId?: string }>,
  usersById: Set<string>,
): VirtualStaffCounts {
  const counts: VirtualStaffCounts = { admins: 0, riders: 0 };

  for (const riderDoc of ridersSnap.docs) {
    const riderId = riderDoc.id;
    const riderData = riderDoc.data();
    const businessRef = riderDoc.ref.parent.parent;
    if (!businessRef) continue;

    const business = businessById.get(businessRef.id);
    if (!business) continue;
    if (riderId === business.ownerId) continue;
    if (String(riderData.role || "").trim().toLowerCase() === "owner") continue;
    if (riderData.isActive === false) continue;
    if (staffRecordHasLinkedUserAccount(riderId, riderData, usersById)) continue;

    const staffRole =
      resolveMemberStaffSubRole(riderData as Record<string, unknown>) ?? "rider";
    if (staffRole === "admin") counts.admins += 1;
    if (staffRole === "rider") counts.riders += 1;
  }

  return counts;
}
