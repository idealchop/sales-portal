
'use client';

import { useEffect, useState } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { Commission } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';

export function useAllCommissions() {
  const { firestore, isFirebaseLoading } = useFirebase();
  const [commissions, setCommissions] = useState<WithId<Commission>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAllCommissions = async () => {
      if (isFirebaseLoading || !firestore) {
        return;
      }
      setIsLoading(true);

      try {
        const commissionsQuery = query(collection(firestore, "commissions"));
        const querySnapshot = await getDocs(commissionsQuery);
        
        const allCommissions: WithId<Commission>[] = [];
        querySnapshot.forEach(doc => {
            const data = doc.data() as Omit<Commission, 'id'>;
            let createdAtString: string;
            if (data.createdAt && typeof (data.createdAt as any).toDate === 'function') {
                createdAtString = (data.createdAt as any).toDate().toISOString();
            } else {
                createdAtString = data.createdAt as string;
            }
            allCommissions.push({
                ...data as Commission,
                id: doc.id,
                createdAt: createdAtString,
            });
        });

        allCommissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setCommissions(allCommissions);

      } catch (e: any) {
        setError(e);
        console.error("Error fetching all commissions:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllCommissions();

  }, [firestore, isFirebaseLoading]);

  return { commissions, isLoading: isLoading || isFirebaseLoading, error };
}
