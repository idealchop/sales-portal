
'use client';

import { useMemo, useEffect, useState } from 'react';
import { collection, collectionGroup, getDocs, query, Query, DocumentData, CollectionReference, where } from 'firebase/firestore';
import { useFirebase, useUser, useMemoFirebase } from '@/firebase';
import type { Client, Proposal } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';
import { useClients } from './use-clients';

interface UseProposalsResult {
  proposals: WithId<Proposal>[];
  isLoading: boolean;
  error: Error | null;
}

export function useProposals(userId?: string): UseProposalsResult {
  const { firestore, isFirebaseLoading } = useFirebase();
  const { user, isUserLoading } = useUser();

  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetUserId = userId || user?.uid;

  useEffect(() => {
    const fetchAllProposals = async () => {
      if (isFirebaseLoading || isUserLoading || !firestore || !targetUserId) {
        if (!targetUserId) {
          // If no user ID is available yet, don't set loading to false, just wait.
           setIsLoading(true);
        }
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
        
        const allProposals: WithId<Proposal>[] = [];
        querySnapshot.forEach(doc => {
            const proposalData = doc.data() as Omit<Proposal, 'id'>;
            const clientDoc = doc.ref.parent.parent;
            if (clientDoc) {
                let createdAtString: string;
                if (proposalData.createdAt && typeof (proposalData.createdAt as any).toDate === 'function') {
                    createdAtString = (proposalData.createdAt as any).toDate().toISOString();
                } else {
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
        console.error("Failed to fetch user-specific proposals:", e);
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllProposals();
  }, [firestore, targetUserId, isFirebaseLoading, isUserLoading]);

  return { 
    proposals, 
    isLoading: isLoading || isFirebaseLoading || isUserLoading, 
    error: error
  };
}
