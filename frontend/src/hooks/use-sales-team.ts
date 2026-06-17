"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchSalesTeam, type TeamMemberSummary } from "@/lib/sales/api";

export function useSalesTeam() {
  const [members, setMembers] = useState<TeamMemberSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSalesTeam();
      setMembers(data);
    } catch {
      setError("Unable to load team summary.");
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchSalesTeam()
      .then((data) => {
        if (cancelled) return;
        setMembers(data);
        setError(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Unable to load team summary.");
        setMembers([]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { members, isLoading, error, refresh };
}
