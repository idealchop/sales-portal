
'use client';

import { useMemo, useEffect, useState } from 'react';
import { collection, query, getDocs, onSnapshot, FirestoreError } from 'firebase/firestore';
import { useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
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
    if (isFirebaseLoading || !firestore) {
      return;
    }
    
    setIsLoading(true);
    
    const usersQuery = query(collection(firestore, 'sales'));

    const unsubscribe = onSnapshot(usersQuery, (querySnapshot) => {
        const users: WithId<UserProfile>[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data() as Omit<UserProfile, 'id'>;
            
            let createdAtString: string | undefined = undefined;
            if (data.createdAt) {
                // Handle both Firestore Timestamp and string formats
                if (typeof (data.createdAt as any).toDate === 'function') {
                    createdAtString = (data.createdAt as any).toDate().toISOString();
                } else if (typeof data.createdAt === 'string') {
                    createdAtString = data.createdAt;
                }
            }

            users.push({ 
                id: doc.id, 
                ...data,
                createdAt: createdAtString
            } as WithId<UserProfile>);
        });
        setSalesUsers(users);
        setError(null);
        setIsLoading(false);
    }, (e: FirestoreError) => {
        const permissionError = new FirestorePermissionError({
          path: 'sales',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        console.error("Error fetching sales users:", e);
        setIsLoading(false);
    });
    
    return () => unsubscribe();

  }, [firestore, isFirebaseLoading]);

  return { salesUsers, isLoading: isLoading || isFirebaseLoading, error };
}
