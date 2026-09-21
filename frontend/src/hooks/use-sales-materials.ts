"use client";

import { useCallback } from "react";
import {
  createSalesMaterial,
  deleteSalesMaterial,
  fetchSalesMaterials,
  updateSalesMaterial,
  type SalesMaterial,
} from "@/lib/sales/api";
import { usePromiseResource } from "@/hooks/use-promise-resource";

const EMPTY: SalesMaterial[] = [];

export function useSalesMaterials() {
  const load = useCallback(() => fetchSalesMaterials(), []);

  const { data: materials, setData, isLoading, isFetching, error, refresh } =
    usePromiseResource({
      load,
      initial: EMPTY,
      errorMessage: "Unable to load sales materials.",
    });

  const saveMaterial = useCallback(
    async (
      input: {
        title: string;
        description?: string;
        type?: SalesMaterial["type"];
        url: string;
        imageId?: string;
      },
      materialId?: string,
    ) => {
      if (materialId) {
        const updated = await updateSalesMaterial(materialId, input);
        setData((previous) =>
          previous.map((row) => (row.id === updated.id ? updated : row)),
        );
        return updated;
      }
      const created = await createSalesMaterial(input);
      setData((previous) => [
        created,
        ...previous.filter((row) => row.id !== created.id),
      ]);
      return created;
    },
    [setData],
  );

  const removeMaterial = useCallback(
    async (materialId: string) => {
      await deleteSalesMaterial(materialId);
      setData((previous) => previous.filter((row) => row.id !== materialId));
    },
    [setData],
  );

  return {
    materials,
    isLoading,
    isFetching,
    error,
    refresh,
    saveMaterial,
    removeMaterial,
  };
}
