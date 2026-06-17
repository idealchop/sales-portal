"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchProposals } from "@/lib/sales/api";
import type { Proposal } from "@/lib/definitions";

export function useProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProposals();
      setProposals(data);
    } catch {
      setError("Unable to load proposals.");
      setProposals([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchProposals()
      .then((data) => {
        if (cancelled) return;
        setProposals(data);
        setError(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Unable to load proposals.");
        setProposals([]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { proposals, isLoading, error, refresh };
}
