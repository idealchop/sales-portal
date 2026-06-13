"use client";

import { useCallback, useState } from "react";
import { fetchDashboardAnalytics } from "@/lib/dashboard/fetch-dashboard-analytics";
import {
  type ActiveOwner,
  type BusinessMapLocation,
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
      const result = await fetchDashboardAnalytics({ force: true });
      const data = result.data;
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
