
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
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

    setIsLoading(true);

    const commissionsQuery = query(collection(firestore, 'commissions'), where('userId', '==', targetUserId));
    const clientsQuery = query(collection(firestore, 'clients'), where('userId', '==', targetUserId));

    const unsubCommissions = onSnapshot(commissionsQuery, (snapshot) => {
        const userCommissions: WithId<Commission>[] = [];
        snapshot.forEach(doc => {
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
        if(!areClientsLoading) setIsLoading(false);
    }, (e) => {
        console.error("Error fetching commissions:", e);
        setError(e);
        setIsLoading(false);
    });

    let areClientsLoading = true;
    const unsubClients = onSnapshot(clientsQuery, async (snapshot) => {
        const userClients: WithId<Client>[] = [];
        snapshot.forEach(doc => {
            userClients.push({ id: doc.id, ...doc.data() } as WithId<Client>);
        });
        setClients(userClients);
        
        // After getting clients, fetch their proposals
        const allProposals: WithId<Proposal>[] = [];
        if (userClients.length > 0) {
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
        }
        setProposals(allProposals);
        areClientsLoading = false;
        setIsLoading(false);

    }, (e) => {
        console.error("Error fetching clients:", e);
        setError(e);
        setIsLoading(false);
    });
    

    return () => {
        unsubCommissions();
        unsubClients();
    };

  }, [firestore, targetUserId, isFirebaseLoading]);

  const combinedIsLoading = isLoading || isFirebaseLoading || isUserAuthLoading;

  return { commissions, clients, proposals, isLoading: combinedIsLoading, error };
}

    