
'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, onSnapshot, FirestoreError, collectionGroup } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { Proposal } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';

interface UseAllProposalsResult {
  proposals: WithId<Proposal>[];
  isLoading: boolean;
  error: Error | null;
}

export function useAllProposals(): UseAllProposalsResult {
  const { firestore, isFirebaseLoading } = useFirebase();
  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isFirebaseLoading || !firestore) {
      return;
    }

    setIsLoading(true);
    
    const proposalsQuery = query(collectionGroup(firestore, 'proposals'));

    const unsubscribe = onSnapshot(proposalsQuery, 
      (querySnapshot) => {
        const allProposals: WithId<Proposal>[] = [];
        querySnapshot.forEach(doc => {
            const proposalData = doc.data() as Omit<Proposal, 'id'>;
            let createdAtString: string;
            if (proposalData.createdAt && typeof (proposalData.createdAt as any).toDate === 'function') {
                createdAtString = (proposalData.createdAt as any).toDate().toISOString();
            } else {
                createdAtString = proposalData.createdAt as string;
            }

            allProposals.push({
                ...(proposalData as Proposal),
                id: doc.id,
                clientId: doc.ref.parent.parent?.id || '',
                createdAt: createdAtString,
                amount: proposalData.amount || 0, // Ensure amount is always present
            });
        });

        allProposals.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        setProposals(allProposals);
        setError(null);
        setIsLoading(false);
      },
      (e: FirestoreError) => {
        console.error("Failed to fetch all proposals:", e);
        setError(e);
        setIsLoading(false);
      }
    );
    
    return () => unsubscribe();

  }, [firestore, isFirebaseLoading]);

  return { 
    proposals, 
    isLoading,
    error
  };
}
