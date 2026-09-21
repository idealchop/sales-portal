"use client";

import { useCallback } from "react";
import { fetchSalesTeam, type TeamMemberSummary } from "@/lib/sales/api";
import { usePromiseResource } from "@/hooks/use-promise-resource";

const EMPTY: TeamMemberSummary[] = [];

export function useSalesTeam() {
  const load = useCallback(() => fetchSalesTeam(), []);

  const { data: members, isLoading, isFetching, error, refresh } =
    usePromiseResource({
      load,
      initial: EMPTY,
      errorMessage: "Unable to load team summary.",
    });

  return { members, isLoading, isFetching, error, refresh };
}
