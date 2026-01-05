
'use client';

import { useMemo, useEffect, useState } from 'react';
import { collection, getDocs, query, where, onSnapshot, FirestoreError } from 'firebase/firestore';
import { useFirebase, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { Proposal } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';
import { useClients } from './use-clients';

interface UseProposalsResult {
  proposals: WithId<Proposal>[];
  isLoading: boolean;
  error: Error | null;
}

export function useProposals(userId?: string): UseProposalsResult {
  const { firestore, isFirebaseLoading: isFirebasePrimaryLoading } = useFirebase();
  const { user, isUserLoading: isUserPrimaryLoading } = useUser();
  const targetUserId = userId || user?.uid;
  
  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isFirebasePrimaryLoading || isUserPrimaryLoading || !firestore || !targetUserId) {
      if(!targetUserId) setIsLoading(true);
      return;
    }
    
    setIsLoading(true);
    setError(null);
  
    const proposalsQuery = query(collection(firestore, "proposals"), where('userId', '==', targetUserId));
    
    const unsubscribe = onSnapshot(proposalsQuery, 
      (snapshot) => {
        const userProposals = snapshot.docs.map(doc => {
            const proposalData = doc.data() as Omit<Proposal, 'id'>;
            let createdAtString: string;
            if (proposalData.createdAt && typeof (proposalData.createdAt as any).toDate === 'function') {
                createdAtString = (proposalData.createdAt as any).toDate().toISOString();
            } else {
                createdAtString = proposalData.createdAt as string;
            }
            return {
                ...(proposalData as Proposal),
                id: doc.id,
                createdAt: createdAtString,
            };
        });

        userProposals.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        setProposals(userProposals);
        setIsLoading(false);
      },
      (e: FirestoreError) => {
        const permissionError = new FirestorePermissionError({
          path: 'proposals',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        console.error(`Error fetching proposals for user ${targetUserId}:`, e);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();

  }, [firestore, targetUserId, isFirebasePrimaryLoading, isUserPrimaryLoading]);

  return { 
    proposals, 
    isLoading: isLoading || isFirebasePrimaryLoading || isUserPrimaryLoading, 
    error
  };
}

    