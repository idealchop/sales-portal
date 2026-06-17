"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchClients } from "@/lib/sales/api";
import type { Client } from "@/lib/definitions";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchClients();
      setClients(data);
    } catch {
      setError("Unable to load clients.");
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchClients()
      .then((data) => {
        if (cancelled) return;
        setClients(data);
        setError(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Unable to load clients.");
        setClients([]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { clients, isLoading, error, refresh };
}
