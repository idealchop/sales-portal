
'use client';

import { useMemo, useEffect, useState } from 'react';
import { collection, getDocs, query, where, collectionGroup } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import type { Proposal } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';

interface UseProposalsResult {
  proposals: WithId<Proposal>[];
  isLoading: boolean;
  error: Error | null;
}

export function useProposals(userId?: string): UseProposalsResult {
  const { firestore, isFirebaseLoading } = useFirebase();
  const { user, isUserLoading } = useUser();
  const targetUserId = userId || user?.uid;
  
  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProposals = async () => {
      if (isFirebaseLoading || isUserLoading || !firestore || !targetUserId) {
        return;
      }
      
      setIsLoading(true);
      setError(null);

      try {
        const proposalsQuery = query(
          collectionGroup(firestore, 'proposals'),
          where('userId', '==', targetUserId)
        );

        const querySnapshot = await getDocs(proposalsQuery);
        const fetchedProposals: WithId<Proposal>[] = [];

        querySnapshot.forEach(doc => {
          const proposalData = doc.data() as Omit<Proposal, 'id'>;
          let createdAtString: string;
          if (proposalData.createdAt && typeof (proposalData.createdAt as any).toDate === 'function') {
            createdAtString = (proposalData.createdAt as any).toDate().toISOString();
          } else {
            createdAtString = proposalData.createdAt as string;
          }

          const clientId = doc.ref.parent.parent?.id;

          if (clientId) {
            fetchedProposals.push({
                ...(proposalData as Proposal),
                id: doc.id,
                clientId: clientId, 
                createdAt: createdAtString,
            });
          }
        });
        
        fetchedProposals.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        setProposals(fetchedProposals);

      } catch (e: any) {
        console.error("Failed to fetch proposals:", e);
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposals();

  }, [firestore, targetUserId, isFirebaseLoading, isUserLoading]);

  return { 
    proposals, 
    isLoading: isLoading || isFirebaseLoading || isUserLoading, 
    error
  };
}
