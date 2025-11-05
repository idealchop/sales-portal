
'use client';

import { useMemo, useEffect, useState } from 'react';
import { collection, getDocs, query, Query, DocumentData, CollectionReference } from 'firebase/firestore';
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
  const { clients, isLoading: clientsLoading, error: clientsError } = useClients();

  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAllProposals = async () => {
      if (isFirebaseLoading || isUserLoading || clientsLoading || !firestore) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const allProposals: WithId<Proposal>[] = [];
        
        for (const client of clients) {
          const proposalsRef = collection(firestore, 'clients', client.id, 'proposals');
          const proposalsQuery = query(proposalsRef);
          const proposalSnapshot = await getDocs(proposalsQuery);
          
          proposalSnapshot.forEach(doc => {
            const proposalData = doc.data() as Proposal;
            allProposals.push({
              ...proposalData,
              id: doc.id,
              clientId: client.id, // Explicitly associate client ID
            });
          });
        }
        setProposals(allProposals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      } catch (e: any) {
        console.error("Failed to fetch proposals:", e);
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllProposals();
  }, [firestore, user, isFirebaseLoading, isUserLoading, clients, clientsLoading]);

  return { 
    proposals, 
    isLoading: isLoading || isFirebaseLoading || isUserLoading || clientsLoading, 
    error: error || clientsError 
  };
}
