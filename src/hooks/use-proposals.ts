
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

  const { data: proposals, isLoading, error } = useCollection<WithId<Proposal>>(proposalsQuery);

  return { proposals: proposals || [], isLoading, error };
}
