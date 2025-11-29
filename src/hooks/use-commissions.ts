
'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, onSnapshot, getDocs, collectionGroup, FirestoreError } from 'firebase/firestore';
import { useFirebase, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { Commission, Client, Proposal, UserProfile } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';
import { format, startOfMonth, isWithinInterval, addYears, parseISO } from 'date-fns';
import type { FinalPlanDetails } from '@/components/contract-details';
import { useSalesUsers } from './use-sales-users';

export type PayoutCommission = Commission & { clientName?: string };

export type MonthlyPayout = {
    month: string;
    totalAmount: number;
    status: 'paid' | 'pending';
    timelineStatus: 'calculated' | 'reviewed' | 'processing' | 'paid';
    commissions: WithId<PayoutCommission>[];
    transactionId: string;
};

export function useCommissions(userId?: string) {
  const { firestore, isFirebaseLoading } = useFirebase();
  const { user: authUser, isUserLoading: isUserAuthLoading, isManager } = useUser();
  const { salesUsers, isLoading: isSalesUsersLoading } = useSalesUsers();
  
  const [commissions, setCommissions] = useState<WithId<Commission>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetUserId = userId || authUser?.id;

  const teamMemberIds = useMemo(() => {
    if (!isManager || !authUser || isSalesUsersLoading) return [];
    const managerTeamName = `${authUser.location} (${authUser.displayName})`;
    return salesUsers.filter(u => u.team === managerTeamName).map(u => u.id);
  }, [isManager, authUser, salesUsers, isSalesUsersLoading]);

  useEffect(() => {
    if (!firestore || isFirebaseLoading || !targetUserId) {
      if (!targetUserId && !isUserAuthLoading && !isSalesUsersLoading) setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const isManagerViewingSelf = isManager && targetUserId === authUser?.id;
    
    // For managers viewing their own payouts, we need their direct commissions
    // AND override commissions. The override commissions are already assigned to their userId,
    // so a single query for their userId is sufficient and correct.
    const userIdsToQuery = isManagerViewingSelf ? [targetUserId] : [targetUserId];

    if (userIdsToQuery.length === 0) {
        setCommissions([]);
        setIsLoading(false);
        return;
    }

    const commissionsQuery = query(collection(firestore, 'commissions'), where('userId', 'in', userIdsToQuery));
    
    const unsubscribe = onSnapshot(commissionsQuery, (snapshot) => {
        const userCommissions: WithId<Commission>[] = [];
        snapshot.forEach(doc => {
            const data = doc.data() as Omit<Commission, 'id'>;
            let createdAtString: string;
            if (data.createdAt && typeof (data.createdAt as any).toDate === 'function') {
                createdAtString = (data.createdAt as any).toDate().toISOString();
            } else {
                createdAtString = data.createdAt as string;
            }
            userCommissions.push({ ...data as Commission, id: doc.id, createdAt: createdAtString });
        });
        setCommissions(userCommissions);
        setIsLoading(false); 
    }, (e: FirestoreError) => {
        const permissionError = new FirestorePermissionError({ path: 'commissions', operation: 'list' });
        errorEmitter.emit('permission-error', permissionError);
        console.error("Error fetching commissions:", e);
        setError(permissionError);
        setIsLoading(false);
    });

    return () => {
        unsubscribe();
    };

  }, [firestore, isFirebaseLoading, isUserAuthLoading, isSalesUsersLoading, targetUserId, isManager, authUser?.id]);
  
    const allPayouts = useMemo(() => {
        if (isLoading) return [];
        
        const commissionsByMonth: Record<string, WithId<PayoutCommission>[]> = {};

        commissions.forEach(commission => {
            if(!commission.createdAt) return;
            const monthKey = format(startOfMonth(new Date(commission.createdAt)), 'MMMM yyyy');
            if (!commissionsByMonth[monthKey]) {
                commissionsByMonth[monthKey] = [];
            }
            commissionsByMonth[monthKey].push(commission);
        });

        const processedPayouts: MonthlyPayout[] = [];

        Object.keys(commissionsByMonth).forEach(month => {
            const userCommissions = commissionsByMonth[month];
            const totalAmount = userCommissions.reduce((sum, c) => sum + c.amount, 0);
            if (totalAmount === 0) return;
            
            const allPaid = !userCommissions.some(c => c.status === 'pending');
            const status = allPaid ? 'paid' : 'pending';
            const userIdForTx = targetUserId ? targetUserId.slice(0, 4).toUpperCase() : 'USER';
            
            processedPayouts.push({
                month,
                totalAmount,
                status,
                timelineStatus: allPaid ? 'paid' : 'calculated',
                commissions: userCommissions,
                transactionId: `SR-PO-${new Date(month).getFullYear()}${String(new Date(month).getMonth() + 1).padStart(2, '0')}-${userIdForTx}`
            });
        });

        processedPayouts.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
        return processedPayouts;
    }, [commissions, isLoading, targetUserId]);

    const availableYears = useMemo(() => {
        const yearSet = new Set<string>();
        allPayouts.forEach(payout => {
            const date = new Date(payout.month);
            yearSet.add(date.getFullYear().toString());
        });
        return Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a));
    }, [allPayouts]);

    const combinedIsLoading = isLoading || isFirebaseLoading || isUserAuthLoading || isSalesUsersLoading;

    return { allPayouts, commissions, isLoading: combinedIsLoading, error, availableYears };
}
