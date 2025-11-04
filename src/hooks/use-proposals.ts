
'use client';

import { useMemo } from 'react';
import { collectionGroup, query, where } from 'firebase/firestore';
import { useCollection, useFirebase, useUser, useMemoFirebase } from '@/firebase';
import type { Proposal } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';
import { useClients } from './use-clients';

export function useProposals() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { clients, isLoading: clientsLoading } = useClients();

  const proposalsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collectionGroup(firestore, 'proposals'));
  }, [firestore, user]);

  const { data: proposals, isLoading: proposalsLoading, error } = useCollection<WithId<Proposal>>(proposalsQuery);

  const enrichedProposals = useMemo(() => {
    if (!proposals || !clients) return [];
    
    return proposals.map(p => {
        const client = clients.find(c => c.id === p.clientId);
        return {
            ...p,
            client: client ? {
                id: client.id,
                companyName: client.companyName,
                contactName: client.contactName,
            } : {
                id: p.clientId,
                companyName: 'Loading Client...',
                contactName: ''
            }
        };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  }, [proposals, clients]);

  return { proposals: enrichedProposals, isLoading: proposalsLoading || clientsLoading, error };
}
