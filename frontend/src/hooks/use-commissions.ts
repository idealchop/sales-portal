"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchCommissions } from "@/lib/sales/api";
import type { Commission } from "@/lib/definitions";

export function useCommissions() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCommissions();
      setCommissions(data);
    } catch {
      setError("Unable to load commissions.");
      setCommissions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchCommissions()
      .then((data) => {
        if (cancelled) return;
        setCommissions(data);
        setError(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Unable to load commissions.");
        setCommissions([]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { commissions, isLoading, error, refresh };
}
