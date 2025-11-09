
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import type { Commission, Client, Proposal } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';

export function useCommissions(userId?: string) {
  const { firestore, isFirebaseLoading } = useFirebase();
  const { user, isUserLoading: isUserAuthLoading } = useUser();
  const [commissions, setCommissions] = useState<WithId<Commission>[]>([]);
  const [clients, setClients] = useState<WithId<Client>[]>([]);
  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetUserId = userId || user?.uid;

  useEffect(() => {
    if (!targetUserId || !firestore || isFirebaseLoading) {
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch commissions
        const commissionsQuery = query(collection(firestore, 'commissions'), where('userId', '==', targetUserId));
        const commissionsSnapshot = await getDocs(commissionsQuery);
        const userCommissions: WithId<Commission>[] = [];
        commissionsSnapshot.forEach(doc => {
            const data = doc.data() as Omit<Commission, 'id'>;
            let createdAtString: string;
            if (data.createdAt && typeof (data.createdAt as any).toDate === 'function') {
                createdAtString = (data.createdAt as any).toDate().toISOString();
            } else {
                createdAtString = data.createdAt as string;
            }
            userCommissions.push({
                ...data as Commission,
                id: doc.id,
                createdAt: createdAtString,
            });
        });
        userCommissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setCommissions(userCommissions);
        
        // Fetch clients
        const clientsQuery = query(collection(firestore, "clients"), where('userId', '==', targetUserId));
        const clientsSnapshot = await getDocs(clientsQuery);
        const userClients: WithId<Client>[] = [];
        clientsSnapshot.forEach(doc => {
            userClients.push({ id: doc.id, ...doc.data() } as WithId<Client>);
        });
        setClients(userClients);

        // Fetch proposals for each client
        const allProposals: WithId<Proposal>[] = [];
        for (const client of userClients) {
          const proposalsRef = collection(firestore, `clients/${client.id}/proposals`);
          const proposalsQuery = query(proposalsRef, where('userId', '==', targetUserId));
          const proposalsSnapshot = await getDocs(proposalsQuery);
          proposalsSnapshot.forEach(doc => {
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
        allProposals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setProposals(allProposals);

      } catch (e: any) {
        setError(e);
        console.error("Error fetching commissions and related data:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

  }, [firestore, targetUserId, isFirebaseLoading]);

  const combinedIsLoading = isLoading || isFirebaseLoading || isUserAuthLoading;

  return { commissions, clients, proposals, isLoading: combinedIsLoading, error };
}
