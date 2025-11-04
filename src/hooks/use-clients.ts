
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

  const { data: clients, isLoading, error } = useCollection<WithId<Client>>(clientsQuery);

  return { clients: clients || [], isLoading, error };
}
