
'use client';

import { useMemo, useEffect, useState } from 'react';
import { collection, collectionGroup, getDocs, query, Query, DocumentData, CollectionReference } from 'firebase/firestore';
import { useFirebase, useUser, useMemoFirebase } from '@/firebase';
import type { Client, Proposal } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';
import { useClients } from './use-clients';

interface UseProposalsResult {
  proposals: WithId<Proposal>[];
  isLoading: boolean;
  error: Error | null;
}

export function useProposals(): UseProposalsResult {
  const { firestore, isFirebaseLoading } = useFirebase();
  const { user, isUserLoading } = useUser();

  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAllProposals = async () => {
      if (isFirebaseLoading || isUserLoading || !firestore) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const proposalsQuery = query(collectionGroup(firestore, 'proposals'));
        const querySnapshot = await getDocs(proposalsQuery);
        
        const allProposals: WithId<Proposal>[] = [];
        querySnapshot.forEach(doc => {
            const proposalData = doc.data() as Proposal;
            // The parent of a document in a subcollection is the client document
            const clientDoc = doc.ref.parent.parent;
            if (clientDoc) {
                allProposals.push({
                    ...proposalData,
                    id: doc.id,
                    clientId: clientDoc.id, // Extract client ID from parent reference
                });
            }
        });

        setProposals(allProposals.sort((a, b) => {
            // Handle potential string or Firestore Timestamp values for createdAt
            const dateA = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt) : (a.createdAt as any).toDate()) : new Date(0);
            const dateB = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt) : (b.createdAt as any).toDate()) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        }));
        
      } catch (e: any) {
        console.error("Failed to fetch proposals using collectionGroup:", e);
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllProposals();
  }, [firestore, user, isFirebaseLoading, isUserLoading]);

  return { 
    proposals, 
    isLoading: isLoading || isFirebaseLoading || isUserLoading, 
    error: error
  };
}
