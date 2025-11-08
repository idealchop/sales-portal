
'use client';

import { useMemo, useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
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
  
  const { clients, isLoading: areClientsLoading, error: clientsError } = useClients(targetUserId);

  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProposals = async () => {
      if (isFirebasePrimaryLoading || isUserPrimaryLoading || areClientsLoading || !firestore || !targetUserId) {
        return;
      }

      if (clientsError) {
        setError(clientsError);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);

      try {
        if (clients.length === 0) {
            setProposals([]);
            setIsLoading(false);
            return;
        }

        const allProposals: WithId<Proposal>[] = [];
        // Fetch proposals for each client
        for (const client of clients) {
          const proposalsRef = collection(firestore, `clients/${client.id}/proposals`);
          const proposalsQuery = query(proposalsRef, where('userId', '==', targetUserId));
          const querySnapshot = await getDocs(proposalsQuery);
          
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
                clientId: client.id, 
                createdAt: createdAtString,
            });
          });
        }
        
        allProposals.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        setProposals(allProposals);

      } catch (e: any) {
        console.error("Failed to fetch proposals:", e);
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposals();

  }, [firestore, targetUserId, isFirebasePrimaryLoading, isUserPrimaryLoading, areClientsLoading, clients, clientsError]);

  return { 
    proposals, 
    isLoading: isLoading || isFirebasePrimaryLoading || isUserPrimaryLoading || areClientsLoading, 
    error
  };
}
