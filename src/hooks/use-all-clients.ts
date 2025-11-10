
'use client';

import { useEffect, useState } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { Client } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';

export function useAllClients() {
  const { firestore, isFirebaseLoading } = useFirebase();
  const [clients, setClients] = useState<WithId<Client>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAllClients = async () => {
      if (isFirebaseLoading || !firestore) {
        return;
      }
      setIsLoading(true);

      try {
        const clientsQuery = query(collection(firestore, "clients"));
        const querySnapshot = await getDocs(clientsQuery);
        
        const allClients: WithId<Client>[] = [];
        querySnapshot.forEach(doc => {
            allClients.push({ id: doc.id, ...doc.data() } as WithId<Client>);
        });

        setClients(allClients);
      } catch (e: any) {
        setError(e);
        console.error("Error fetching all clients:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllClients();

  }, [firestore, isFirebaseLoading]);


  return { clients, isLoading: isLoading || isFirebaseLoading, error };
}
