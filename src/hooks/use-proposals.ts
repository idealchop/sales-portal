
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
            const proposalData = doc.data() as Omit<Proposal, 'id'>;
            const clientDoc = doc.ref.parent.parent;
            if (clientDoc) {
                // Ensure createdAt is a string for consistent handling
                let createdAtString: string;
                if (proposalData.createdAt && typeof (proposalData.createdAt as any).toDate === 'function') {
                    // It's a Firestore Timestamp
                    createdAtString = (proposalData.createdAt as any).toDate().toISOString();
                } else {
                    // It's already a string or something else
                    createdAtString = proposalData.createdAt as string;
                }

                allProposals.push({
                    ...(proposalData as Proposal),
                    id: doc.id,
                    clientId: clientDoc.id,
                    createdAt: createdAtString,
                });
            }
        });

        allProposals.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        setProposals(allProposals);
        
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
