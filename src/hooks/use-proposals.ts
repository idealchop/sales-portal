
'use client';

import { useMemo } from 'react';
import { collectionGroup, query } from 'firebase/firestore';
import { useCollection, useFirebase, useUser, useMemoFirebase } from '@/firebase';
import type { Proposal } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';

export function useProposals() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const proposalsQuery = useMemoFirebase(() => {
    if (!user) return null;
    // This will fetch all documents from all 'proposals' sub-collections
    return query(collectionGroup(firestore, 'proposals'));
  }, [firestore, user]);

  const { data: proposalsData, isLoading, error } = useCollection<Proposal>(proposalsQuery);

  const proposals = useMemo(() => {
    if (!proposalsData) return [];
    return proposalsData.map(proposal => {
        // The path of a sub-collection document is 'clients/{clientId}/proposals/{proposalId}'
        const pathParts = (proposal as any).ref?.path.split('/');
        const clientId = pathParts && pathParts.length > 1 ? pathParts[1] : 'unknown';
        return {
          ...proposal,
          id: proposal.id,
          clientId: clientId
        }
    }) as WithId<Proposal>[];
  }, [proposalsData]);

  return { proposals, isLoading, error };
}

