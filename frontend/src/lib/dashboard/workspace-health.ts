export type WorkspaceHealthTier = "high" | "medium" | "low";

export const WORKSPACE_HEALTH_LABELS: Record<WorkspaceHealthTier, string> = {
  high: "Healthy",
  medium: "Growing",
  low: "At risk",
};

export const WORKSPACE_HEALTH_BADGE_STYLES: Record<WorkspaceHealthTier, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-red-100 text-red-800",
};

export function formatWorkspaceHealthTier(
  tier: WorkspaceHealthTier | undefined | null,
): string {
  if (!tier) return "Unknown";
  return WORKSPACE_HEALTH_LABELS[tier];
}
