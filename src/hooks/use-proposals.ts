
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
  const { firestore, isFirebaseLoading } = useFirebase();
  const { user, isUserLoading } = useUser();
  const targetUserId = userId || user?.uid;
  
  // Use the useClients hook to get clients for the current user first.
  const { clients: userClients, isLoading: clientsAreLoading, error: clientsError } = useClients(targetUserId);

  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // This effect now depends on the result of the useClients hook.
    const fetchProposalsForClients = async () => {
      if (clientsAreLoading || !firestore) {
        return;
      }
      
      // If there are no clients, there can be no proposals.
      if (userClients.length === 0) {
        setProposals([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);

      try {
        const allProposals: WithId<Proposal>[] = [];
        // Create an array of promises, one for each client's proposals subcollection.
        const proposalPromises = userClients.map(client => {
          const proposalsRef = collection(firestore, `clients/${client.id}/proposals`);
          const proposalsQuery = query(proposalsRef, where('userId', '==', targetUserId));
          return getDocs(proposalsQuery);
        });

        // Await all promises to resolve.
        const allSnapshots = await Promise.all(proposalPromises);

        allSnapshots.forEach((snapshot, index) => {
            const client = userClients[index];
            snapshot.forEach(doc => {
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
        });
        
        allProposals.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        setProposals(allProposals);

      } catch (e: any) {
        console.error("Failed to fetch proposals for clients:", e);
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposalsForClients();

  }, [firestore, targetUserId, clientsAreLoading, userClients]);

  return { 
    proposals, 
    isLoading: isLoading || isFirebaseLoading || isUserLoading || clientsAreLoading, 
    error: error || clientsError
  };
}
