
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirebase, useUser, useMemoFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';

/**
 * Hook to fetch all sales user profiles.
 * Note: Requires security rules to allow reading the 'sales' collection.
 */
export function useSalesUsers() {
  const { firestore, isFirebaseLoading } = useFirebase();
  const { user, isUserLoading } = useUser();

  const usersQuery = useMemoFirebase(() => {
    if (isFirebaseLoading || !firestore) return null;
    return query(collection(firestore, 'sales'));
  }, [firestore, isFirebaseLoading]);

  const { data: salesUsersData, isLoading, error } = useCollection<UserProfile>(usersQuery);

  const salesUsers = useMemo(() => {
    if (!salesUsersData) return [];
    return salesUsersData.map(userProfile => ({
      ...userProfile,
      id: userProfile.id,
    })) as WithId<UserProfile>[];
  }, [salesUsersData]);

  return { salesUsers, isLoading: isLoading || isFirebaseLoading, error };
}
