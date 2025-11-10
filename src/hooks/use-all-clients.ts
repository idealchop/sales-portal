
'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, DocumentData, FirestoreError } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { Client } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';

export function useAllClients() {
  const { firestore, isFirebaseLoading } = useFirebase();
  const [clients, setClients] = useState<WithId<Client>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (isFirebaseLoading || !firestore) {
      return;
    }
    
    if (isInitialLoad) {
      setIsLoading(true);
    }

    const clientsQuery = query(collection(firestore, "clients"));

    const unsubscribe = onSnapshot(clientsQuery, 
      (querySnapshot) => {
        const allClients: WithId<Client>[] = [];
        querySnapshot.forEach(doc => {
            const data = doc.data() as Omit<Client, 'id'>;
            let createdAtString: string | undefined = undefined;
            if (data.createdAt) {
                if (typeof (data.createdAt as any).toDate === 'function') {
                    createdAtString = (data.createdAt as any).toDate().toISOString();
                } else if (typeof data.createdAt === 'string') {
                    createdAtString = data.createdAt;
                }
            }
            allClients.push({ 
                id: doc.id, 
                ...data,
                createdAt: createdAtString
            } as WithId<Client>);
        });
        setClients(allClients);
        setError(null);
        if (isInitialLoad) {
            setIsLoading(false);
            setIsInitialLoad(false);
        }
      },
      (e: FirestoreError) => {
        setError(e);
        console.error("Error fetching all clients with snapshot:", e);
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();

  }, [firestore, isFirebaseLoading, isInitialLoad]);

  return { clients, isLoading: isLoading, error };
}
