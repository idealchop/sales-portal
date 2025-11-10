
'use client';

import { useMemo, useEffect, useState } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';

/**
 * Hook to fetch all sales user profiles.
 * This hook fetches data once and does not subscribe to real-time updates.
 */
export function useSalesUsers() {
  const { firestore, isFirebaseLoading } = useFirebase();
  const [salesUsers, setSalesUsers] = useState<WithId<UserProfile>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (isFirebaseLoading || !firestore) {
        return;
      }
      setIsLoading(true);
      try {
        const usersQuery = query(collection(firestore, 'sales'));
        const querySnapshot = await getDocs(usersQuery);
        const users: WithId<UserProfile>[] = [];
        querySnapshot.forEach((doc) => {
          users.push({ id: doc.id, ...doc.data() } as WithId<UserProfile>);
        });
        setSalesUsers(users);
      } catch (e: any) {
        setError(e);
        console.error("Error fetching sales users:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();

  }, [firestore, isFirebaseLoading]);

  return { salesUsers, isLoading: isLoading || isFirebaseLoading, error };
}
