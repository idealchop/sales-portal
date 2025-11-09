
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import type { Commission } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';

export function useCommissions(userId?: string) {
  const { firestore, isFirebaseLoading } = useFirebase();
  const { user, isUserLoading: isUserAuthLoading } = useUser();
  const [commissions, setCommissions] = useState<WithId<Commission>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetUserId = userId || user?.uid;

  useEffect(() => {
    if (!targetUserId || !firestore || isFirebaseLoading) {
      return;
    }

    const fetchCommissions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const commissionsQuery = query(collection(firestore, 'commissions'), where('userId', '==', targetUserId));
        const querySnapshot = await getDocs(commissionsQuery);
        
        const userCommissions: WithId<Commission>[] = [];
        querySnapshot.forEach(doc => {
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

        // Sort by date descending
        userCommissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setCommissions(userCommissions);

      } catch (e: any) {
        setError(e);
        console.error("Error fetching commissions for user:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommissions();

  }, [firestore, targetUserId, isFirebaseLoading]);

  const combinedIsLoading = isLoading || isFirebaseLoading || isUserAuthLoading;

  return { commissions, isLoading: combinedIsLoading, error };
}
