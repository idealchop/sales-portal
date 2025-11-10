
'use client';

import { useMemo, useEffect, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { Proposal } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';
import { useAllClients } from './use-all-clients';

interface UseAllProposalsResult {
  proposals: WithId<Proposal>[];
  isLoading: boolean;
  error: Error | null;
}

export function useAllProposals(): UseAllProposalsResult {
  const { firestore, isFirebaseLoading } = useFirebase();
  const { clients, isLoading: areClientsLoading, error: clientsError } = useAllClients();

  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProposals = async () => {
      if (isFirebaseLoading || areClientsLoading || !firestore) {
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
        for (const client of clients) {
          const proposalsRef = collection(firestore, `clients/${client.id}/proposals`);
          const proposalsQuery = query(proposalsRef);
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
        console.error("Failed to fetch all proposals:", e);
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposals();

  }, [firestore, isFirebaseLoading, areClientsLoading, clients, clientsError]);

  return { 
    proposals, 
    isLoading: isLoading || isFirebaseLoading || areClientsLoading, 
    error
  };
}
