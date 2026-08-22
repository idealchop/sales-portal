"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchClientDirectory, fetchClients } from "@/lib/sales/api";
import type { Client, ClientDirectoryEntry } from "@/lib/definitions";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [directory, setDirectory] = useState<ClientDirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [clientData, directoryData] = await Promise.all([
        fetchClients(),
        fetchClientDirectory(),
      ]);
      setClients(clientData);
      setDirectory(directoryData);
    } catch {
      setError("Unable to load clients.");
      setClients([]);
      setDirectory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([fetchClients(), fetchClientDirectory()])
      .then(([clientData, directoryData]) => {
        if (cancelled) return;
        setClients(clientData);
        setDirectory(directoryData);
        setError(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Unable to load clients.");
        setClients([]);
        setDirectory([]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { clients, directory, isLoading, error, refresh };
}
