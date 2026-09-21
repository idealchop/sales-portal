"use client";

import { useCallback } from "react";
import { fetchProposals } from "@/lib/sales/api";
import type { Proposal } from "@/lib/definitions";
import { usePromiseResource } from "@/hooks/use-promise-resource";

const EMPTY_PROPOSALS: Proposal[] = [];

export function useProposals() {
  const load = useCallback(() => fetchProposals(), []);

  const { data: proposals, setData, isLoading, isFetching, error, refresh } =
    usePromiseResource({
      load,
      initial: EMPTY_PROPOSALS,
      errorMessage: "Unable to load proposals.",
    });

  return {
    proposals,
    setProposals: setData,
    isLoading,
    isFetching,
    error,
    refresh,
  };
}
