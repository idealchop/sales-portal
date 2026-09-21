"use client";

import { useCallback } from "react";
import { createClient, fetchClientDirectory, fetchClients } from "@/lib/sales/api";
import type { Client, ClientDirectoryEntry } from "@/lib/definitions";
import { usePromiseResource } from "@/hooks/use-promise-resource";

type ClientsState = {
  clients: Client[];
  directory: ClientDirectoryEntry[];
};

const EMPTY: ClientsState = { clients: [], directory: [] };

export function useClients() {
  const load = useCallback(async (): Promise<ClientsState> => {
    const [clients, directory] = await Promise.all([
      fetchClients(),
      fetchClientDirectory(),
    ]);
    return { clients, directory };
  }, []);

  const { data, setData, isLoading, isFetching, error, refresh } =
    usePromiseResource({
      load,
      initial: EMPTY,
      errorMessage: "Unable to load clients.",
    });

  const saveClient = useCallback(
    async (
      input: Partial<Client> & { linkedUserId?: string; appIds?: string[] },
    ) => {
      const created = await createClient(input);
      setData((previous) => ({
        ...previous,
        clients: [
          created,
          ...previous.clients.filter((row) => row.id !== created.id),
        ],
      }));
      // Directory may include new linked users — refresh quietly.
      void refresh();
      return created;
    },
    [refresh, setData],
  );

  return {
    clients: data.clients,
    directory: data.directory,
    isLoading,
    isFetching,
    error,
    refresh,
    saveClient,
  };
}
