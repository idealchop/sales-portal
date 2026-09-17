import type {
  ChartBusinessContext,
  DashboardAnalytics,
} from "@/lib/dashboard/analytics";

type WorkspaceIdentity = {
  name?: string;
  ownerEmail?: string;
};

/** Fill missing workspace name / owner email from map, recent, and top lists. */
export function withWorkspaceNames(
  businesses: ChartBusinessContext[],
  data: Pick<
    DashboardAnalytics,
    "businessLocations" | "recentBusinesses" | "topBusinessesByCustomers"
  >,
): ChartBusinessContext[] {
  const byId = new Map<string, WorkspaceIdentity>();

  const merge = (id: string, next: WorkspaceIdentity) => {
    if (!id) return;
    const prev = byId.get(id) || {};
    byId.set(id, {
      name: prev.name || next.name?.trim() || undefined,
      ownerEmail: prev.ownerEmail || next.ownerEmail?.trim() || undefined,
    });
  };

  for (const row of data.businessLocations ?? []) {
    merge(row.id, { name: row.name, ownerEmail: row.ownerEmail });
  }
  for (const row of data.recentBusinesses ?? []) {
    merge(row.id, { name: row.name, ownerEmail: row.ownerEmail });
  }
  for (const row of data.topBusinessesByCustomers ?? []) {
    merge(row.id, { name: row.name });
  }

  return businesses.map((biz) => {
    const found = byId.get(biz.id);
    if (!found) return biz;
    return {
      ...biz,
      name: biz.name?.trim() || found.name,
      ownerEmail: biz.ownerEmail?.trim() || found.ownerEmail,
    };
  });
}
