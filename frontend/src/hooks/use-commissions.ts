"use client";

import { useCallback } from "react";
import { fetchCommissions } from "@/lib/sales/api";
import type { Commission } from "@/lib/definitions";
import { usePromiseResource } from "@/hooks/use-promise-resource";

const EMPTY: Commission[] = [];

export function useCommissions() {
  const load = useCallback(() => fetchCommissions(), []);

  const { data: commissions, isLoading, isFetching, error, refresh } =
    usePromiseResource({
      load,
      initial: EMPTY,
      errorMessage: "Unable to load commissions.",
    });

  return { commissions, isLoading, isFetching, error, refresh };
}
