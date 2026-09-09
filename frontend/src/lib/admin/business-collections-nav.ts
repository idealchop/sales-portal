import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  Boxes,
  ClipboardList,
  FolderOpen,
  MapPin,
  Settings2,
  Users,
} from "lucide-react";

export type BusinessCollectionGroup = {
  collectionId: string;
  title: string;
  documents: unknown[];
  totalCount?: number;
};

export type BusinessCollectionCategoryId =
  | "operations"
  | "communications"
  | "team"
  | "commerce"
  | "other";

export type BusinessCollectionMeta = {
  collectionId: string;
  title: string;
  description: string;
  categoryId: BusinessCollectionCategoryId;
  icon: LucideIcon;
};

const CATEGORY_LABELS: Record<BusinessCollectionCategoryId, string> = {
  operations: "Operations",
  communications: "Communications",
  team: "Team",
  commerce: "Commerce",
  other: "Other",
};

const COLLECTION_META: Record<
  string,
  Omit<BusinessCollectionMeta, "collectionId" | "title">
> = {
  locations: {
    description: "Station locations and map pins",
    categoryId: "operations",
    icon: MapPin,
  },
  settings: {
    description: "Workspace settings documents",
    categoryId: "operations",
    icon: Settings2,
  },
  counters: {
    description: "Counter and sequence documents",
    categoryId: "operations",
    icon: ClipboardList,
  },
  alert_delivery_log: {
    description: "Push, email, and SMS delivery outcomes",
    categoryId: "communications",
    icon: BellRing,
  },
  river_ai_pending: {
    description: "Queued River AI tool runs awaiting processing",
    categoryId: "operations",
    icon: ClipboardList,
  },
  analytics_daily: {
    description: "Daily analytics rollups for this workspace",
    categoryId: "operations",
    icon: ClipboardList,
  },
  analytics_snapshots: {
    description: "Point-in-time analytics snapshots",
    categoryId: "operations",
    icon: ClipboardList,
  },
  orders: {
    description: "Order-related workspace records",
    categoryId: "commerce",
    icon: Boxes,
  },
  inventory: {
    description: "Legacy inventory documents",
    categoryId: "commerce",
    icon: Boxes,
  },
  riders: {
    description: "Rider roster documents",
    categoryId: "team",
    icon: Users,
  },
};

export function businessCollectionCategoryLabel(
  categoryId: BusinessCollectionCategoryId,
): string {
  return CATEGORY_LABELS[categoryId];
}

export function resolveBusinessCollectionMeta(
  collectionId: string,
  title: string,
): BusinessCollectionMeta {
  const known = COLLECTION_META[collectionId];
  if (known) {
    return {
      collectionId,
      title,
      ...known,
    };
  }
  return {
    collectionId,
    title,
    description: "Firestore subcollection for this workspace",
    categoryId: "other",
    icon: FolderOpen,
  };
}

export function filterBusinessCollectionGroups(
  groups: BusinessCollectionGroup[],
  query: string,
): BusinessCollectionGroup[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return groups;
  return groups.filter((group) => {
    const meta = resolveBusinessCollectionMeta(group.collectionId, group.title);
    const haystack = [
      group.title,
      group.collectionId,
      meta.description,
      businessCollectionCategoryLabel(meta.categoryId),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function groupBusinessCollectionsByCategory(
  groups: BusinessCollectionGroup[],
): Array<{
  categoryId: BusinessCollectionCategoryId;
  label: string;
  groups: BusinessCollectionGroup[];
}> {
  const buckets = new Map<
    BusinessCollectionCategoryId,
    BusinessCollectionGroup[]
  >();

  for (const group of groups) {
    const meta = resolveBusinessCollectionMeta(group.collectionId, group.title);
    const bucket = buckets.get(meta.categoryId) ?? [];
    bucket.push(group);
    buckets.set(meta.categoryId, bucket);
  }

  const order: BusinessCollectionCategoryId[] = [
    "communications",
    "operations",
    "commerce",
    "team",
    "other",
  ];

  return order
    .map((categoryId) => ({
      categoryId,
      label: businessCollectionCategoryLabel(categoryId),
      groups: (buckets.get(categoryId) ?? []).sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      ),
    }))
    .filter((entry) => entry.groups.length > 0);
}
