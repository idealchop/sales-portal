"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchLeadAssignees, type TeamMemberSummary } from "@/lib/sales/api";

/** Sales Portal accounts that can be assigned to a lead. */
export function useLeadAssignees() {
  const [members, setMembers] = useState<TeamMemberSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchLeadAssignees();
      setMembers(data);
    } catch {
      setError("Unable to load sales accounts.");
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchLeadAssignees()
      .then((data) => {
        if (cancelled) return;
        setMembers(data);
        setError(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Unable to load sales accounts.");
        setMembers([]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { members, isLoading, error, refresh };
}
