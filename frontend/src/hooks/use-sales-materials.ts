"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchSalesMaterials, type SalesMaterial } from "@/lib/sales/api";

export function useSalesMaterials() {
  const [materials, setMaterials] = useState<SalesMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSalesMaterials();
      setMaterials(data);
    } catch {
      setError("Unable to load sales materials.");
      setMaterials([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchSalesMaterials()
      .then((data) => {
        if (cancelled) return;
        setMaterials(data);
        setError(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Unable to load sales materials.");
        setMaterials([]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { materials, isLoading, error, refresh };
}
