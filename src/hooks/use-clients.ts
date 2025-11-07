
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import type { Client, Proposal } from '@/lib/definitions';
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
        // 1. Find all proposals created by the user using a collectionGroup query.
        // This is the query that was causing an error before, but it's acceptable here now
        // because we will fix the security rules to allow it.
        const proposalsQuery = query(
          collectionGroup(firestore, 'proposals'),
          where('userId', '==', targetUserId)
        );
        const proposalSnapshots = await getDocs(proposalsQuery);
        
        const clientIds = new Set<string>();
        proposalSnapshots.forEach(doc => {
          // The parent of a document in a subcollection is the collection,
          // and the parent of that collection is the client document.
          const clientDoc = doc.ref.parent.parent;
          if (clientDoc) {
            clientIds.add(clientDoc.id);
          }
        });

        if (clientIds.size === 0) {
            setClients([]);
            setIsLoading(false);
            return;
        }

        // 2. Fetch the client documents in batches.
        const clientPromises = [];
        const idsArray = Array.from(clientIds);
        for (let i = 0; i < idsArray.length; i += 30) {
          const batchIds = idsArray.slice(i, i + 30);
          const clientsQuery = query(collection(firestore, "clients"), where('id', 'in', batchIds));
          clientPromises.push(getDocs(clientsQuery));
        }

        const clientSnapshots = await Promise.all(clientPromises);
        const userClients: WithId<Client>[] = [];
        clientSnapshots.forEach(snapshot => {
           snapshot.forEach(doc => {
            userClients.push({ id: doc.id, ...doc.data() } as WithId<Client>);
          });
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
