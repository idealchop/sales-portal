
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirebase, useUser, useMemoFirebase } from '@/firebase';
import type { Client } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';

export function useClients() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const clientsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'clients'));
  }, [firestore, user]);

  const { data: clientsData, isLoading, error } = useCollection<Client>(clientsQuery);

  const clients = useMemo(() => {
    if (!clientsData) return [];
    return clientsData.map(client => ({
      ...client,
      id: client.id,
    })) as WithId<Client>[];
  }, [clientsData]);

  return { clients, isLoading, error };
}
