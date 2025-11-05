
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirebase, useUser, useMemoFirebase } from '@/firebase';
import type { Client } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';

export function useClients() {
  const { firestore, isFirebaseLoading } = useFirebase();
  const { user, isUserLoading } = useUser();

  const clientsQuery = useMemoFirebase(() => {
    if (isFirebaseLoading || isUserLoading || !firestore || !user) return null;
    return query(collection(firestore, 'clients'));
  }, [firestore, user, isFirebaseLoading, isUserLoading]);

  const { data: clientsData, isLoading, error } = useCollection<Client>(clientsQuery);

  const clients = useMemo(() => {
    if (!clientsData) return [];
    return clientsData.map(client => ({
      ...client,
      id: client.id,
    })) as WithId<Client>[];
  }, [clientsData]);

  return { clients, isLoading: isLoading || isFirebaseLoading || isUserLoading, error };
}
