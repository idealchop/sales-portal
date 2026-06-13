"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/lib/api-client";
import {
  normalizeDashboardAnalytics,
  type ActiveOwner,
  type BusinessMapLocation,
  type DashboardAnalytics,
} from "@/lib/dashboard/analytics";

export function useMapLocations(
  initialLocations: BusinessMapLocation[],
  initialOwners: ActiveOwner[],
) {
  const [localState, setLocalState] = useState({
    locations: initialLocations,
    owners: initialOwners,
    sourceLocations: initialLocations,
    sourceOwners: initialOwners,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (
    localState.sourceLocations !== initialLocations ||
    localState.sourceOwners !== initialOwners
  ) {
    setLocalState({
      locations: initialLocations,
      owners: initialOwners,
      sourceLocations: initialLocations,
      sourceOwners: initialOwners,
    });
  }

  const refreshMap = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await apiClient.get<{ data: DashboardAnalytics }>(
        "/dashboard/analytics",
      );
      const data = normalizeDashboardAnalytics(response.data);
      setLocalState((current) => ({
        ...current,
        locations: data.businessLocations,
        owners: data.growthSalesMetrics.activeOwners,
      }));
    } catch {
      setError("Unable to refresh map.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return {
    locations: localState.locations,
    owners: localState.owners,
    refreshMap,
    isRefreshing,
    error,
  };
}
