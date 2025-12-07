
'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, onSnapshot, getDocs, collectionGroup, FirestoreError } from 'firebase/firestore';
import { useFirebase, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { Commission, Client, Proposal, UserProfile } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';
import { format, startOfMonth, isWithinInterval, addYears, parseISO } from 'date-fns';
import type { FinalPlanDetails } from '@/components/contract-details';
import { useSalesUsers } from './use-sales-users';
import { useAllProposals } from './use-all-proposals';
import { useAllClients } from './use-all-clients';

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
  const { proposals: allProposals, isLoading: proposalsLoading } = useAllProposals();
  const { clients: allClients, isLoading: clientsLoading } = useAllClients();
  
  const [commissions, setCommissions] = useState<WithId<Commission>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const teamMemberIds = useMemo(() => {
    if (!isManager || !authUser || isSalesUsersLoading) return [];
    const managerTeamName = `${authUser.location} (${authUser.displayName})`;
    return salesUsers
        .filter(u => u.team === managerTeamName)
        .map(u => u.id);
  }, [isManager, authUser, salesUsers, isSalesUsersLoading]);

  useEffect(() => {
    if (!firestore || isFirebaseLoading || isUserAuthLoading) {
      return;
    }

    setIsLoading(true);

    let userIdsToQuery: string[] = [];

    if (userId) { 
        userIdsToQuery = [userId];
    } else if (authUser) { 
        if (isManager) {
            userIdsToQuery = [authUser.id, ...teamMemberIds];
        } else {
            userIdsToQuery = [authUser.id];
        }
    }

    if (userIdsToQuery.length === 0) {
        setCommissions([]);
        setIsLoading(false);
        return;
    }
    
    const MAX_IN_QUERIES = 30;
    const queryBatches: string[][] = [];
    for (let i = 0; i < userIdsToQuery.length; i += MAX_IN_QUERIES) {
        queryBatches.push(userIdsToQuery.slice(i, i + MAX_IN_QUERIES));
    }

    const unsubscribers = queryBatches.map(batch => {
        const commissionsQuery = query(collection(firestore, 'commissions'), where('userId', 'in', batch));
        
        return onSnapshot(commissionsQuery, (snapshot) => {
            const fetchedCommissions: WithId<Commission>[] = [];
            snapshot.forEach(doc => {
                const data = doc.data() as Omit<Commission, 'id'>;
                let createdAtString: string;
                if (data.createdAt && typeof (data.createdAt as any).toDate === 'function') {
                    createdAtString = (data.createdAt as any).toDate().toISOString();
                } else {
                    createdAtString = data.createdAt as string;
                }
                fetchedCommissions.push({ ...data as Commission, id: doc.id, createdAt: createdAtString });
            });
            
            setCommissions(prevCommissions => {
                const commissionIdsFromBatch = new Set(batch);
                const otherCommissions = prevCommissions.filter(c => !commissionIdsFromBatch.has(c.userId));
                return [...otherCommissions, ...fetchedCommissions];
            });
            setIsLoading(false); 
        }, (e: FirestoreError) => {
            const permissionError = new FirestorePermissionError({ path: 'commissions', operation: 'list' });
            errorEmitter.emit('permission-error', permissionError);
            console.error("Error fetching commissions:", e);
            setError(permissionError);
            setIsLoading(false);
        });
    });

    return () => {
        unsubscribers.forEach(unsub => unsub());
    };

  }, [firestore, isFirebaseLoading, userId, isManager, teamMemberIds.length, authUser, isUserAuthLoading]);
  
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
            let monthCommissions = commissionsByMonth[month];
            const totalAmount = monthCommissions.reduce((sum, c) => sum + c.amount, 0);
            if (totalAmount === 0) return;
            
            const allPaid = !monthCommissions.some(c => c.status === 'pending');
            const status = allPaid ? 'paid' : 'pending';
            const userIdForTx = (userId || authUser?.id)?.slice(0, 4).toUpperCase() || 'USER';
            
            processedPayouts.push({
                month,
                totalAmount,
                status,
                timelineStatus: allPaid ? 'paid' : 'calculated',
                commissions: monthCommissions,
                transactionId: `SR-PO-${new Date(month).getFullYear()}${String(new Date(month).getMonth() + 1).padStart(2, '0')}-${userIdForTx}`
            });
        });

        processedPayouts.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
        return processedPayouts;
    }, [commissions, isLoading, userId, authUser]);

    const availableYears = useMemo(() => {
        const yearSet = new Set<string>();
        commissions.forEach(commission => {
            if(commission.createdAt) {
                const date = new Date(commission.createdAt);
                yearSet.add(date.getFullYear().toString());
            }
        });
        return Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a));
    }, [commissions]);

    const combinedIsLoading = isLoading || isFirebaseLoading || isUserAuthLoading || isSalesUsersLoading || proposalsLoading || clientsLoading;

    return { allPayouts, commissions, isLoading: combinedIsLoading, error, availableYears };
}
