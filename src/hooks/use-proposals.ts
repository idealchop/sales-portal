
'use client';

import { useMemo } from 'react';
import { collectionGroup, query, where } from 'firebase/firestore';
import { useCollection, useFirebase, useUser, useMemoFirebase } from '@/firebase';
import type { Proposal, Client } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';

export function useProposals() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const proposalsQuery = useMemoFirebase(() => {
    if (!user) return null;
    // Assuming proposals are in a subcollection 'proposals' under each 'client'
    // And that we want to query all proposals across all clients.
    // This requires a collection group index on 'proposals'.
    return query(collectionGroup(firestore, 'proposals'));
  }, [firestore, user]);

  const { data: proposals, isLoading, error } = useCollection<Proposal>(proposalsQuery);

  const enrichedProposals = useMemo(() => {
    if (!proposals) return [];
    // This is a simplified enrichment. In a real app, you might fetch client details
    // separately or structure your data differently.
    return proposals.map(p => ({
        ...p,
        // The client data is not directly available in the proposal document from a collectionGroup query
        // For now, we create a placeholder.
        client: {
            id: p.clientId,
            companyName: 'Client Co.', // Placeholder
            contactName: 'Contact Name' // Placeholder
        }
    }));
  }, [proposals]);

  return { proposals: enrichedProposals, isLoading, error };
}
