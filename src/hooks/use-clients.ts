
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import type { Client } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';

export function useClients(userId?: string) {
  const { firestore, isFirebaseLoading } = useFirebase();
  const { user, isUserLoading } = useUser();
  const [clients, setClients] = useState<WithId<Client>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetUserId = userId || user?.uid;

  useEffect(() => {
    const fetchClientsForUser = async () => {
      if (isFirebaseLoading || isUserLoading || !firestore || !targetUserId) {
        if(!targetUserId) setIsLoading(true);
        return;
      }
      setIsLoading(true);

      try {
        const clientsQuery = query(collection(firestore, "clients"), where('userId', '==', targetUserId));
        const querySnapshot = await getDocs(clientsQuery);
        
        const userClients: WithId<Client>[] = [];
        querySnapshot.forEach(doc => {
            userClients.push({ id: doc.id, ...doc.data() } as WithId<Client>);
        });

        setClients(userClients);

      } catch (e: any) {
        setError(e);
        console.error("Error fetching clients for user:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientsForUser();

  }, [firestore, targetUserId, isUserLoading, isFirebaseLoading]);


  return { clients, isLoading: isLoading || isFirebaseLoading || isUserLoading, error };
}
