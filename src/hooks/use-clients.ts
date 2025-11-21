
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, DocumentData, onSnapshot } from 'firebase/firestore';
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
    if (isFirebaseLoading || isUserLoading || !firestore || !targetUserId) {
      if(!targetUserId) setIsLoading(true);
      return;
    }
    
    setIsLoading(true);

    const clientsQuery = query(collection(firestore, "clients"), where('userId', '==', targetUserId));
    
    const unsubscribe = onSnapshot(clientsQuery, 
      (querySnapshot) => {
        const userClients: WithId<Client>[] = [];
        querySnapshot.forEach(doc => {
            userClients.push({ id: doc.id, ...doc.data() } as WithId<Client>);
        });
        setClients(userClients);
        setError(null);
        setIsLoading(false);
      },
      (e: any) => {
        setError(e);
        console.error("Error fetching clients for user:", e);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();

  }, [firestore, targetUserId, isUserLoading, isFirebaseLoading]);


  return { clients, isLoading: isLoading || isFirebaseLoading || isUserLoading, error };
}


    