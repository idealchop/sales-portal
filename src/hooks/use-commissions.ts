

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

export function useCommissions(userIds?: string | string[], isManagerTeamView = false) {
  const { firestore, isFirebaseLoading } = useFirebase();
  const { user: authUser, isUserLoading: isUserAuthLoading, isManager } = useUser();
  const { salesUsers, isLoading: isSalesUsersLoading } = useSalesUsers();
  
  const [commissions, setCommissions] = useState<WithId<Commission>[]>([]);
  const [clients, setClients] = useState<WithId<Client>[]>([]);
  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetUserIds = useMemo(() => {
    // Admin page case: userIds will be an array of all sales user IDs
    if (Array.isArray(userIds) && userIds.length > 0) return userIds;
    // My Team page case
    if (isManagerTeamView && authUser && isManager && salesUsers.length > 0) {
        const managerTeamName = `${authUser.location} (${authUser.displayName})`;
        const teamMemberIds = salesUsers
            .filter(u => u.team === managerTeamName)
            .map(u => u.id);
        return [authUser.id, ...teamMemberIds];
    }
    // Single user case (string)
    if (typeof userIds === 'string') return [userIds];
    
    // Default/fallback for a regular user viewing their own commissions
    if (authUser) return [authUser.id];

    return [];
  }, [userIds, isManagerTeamView, authUser, isManager, salesUsers]);

  useEffect(() => {
    if (!firestore || isFirebaseLoading || targetUserIds.length === 0) {
      if (targetUserIds.length === 0 && !isUserAuthLoading && !isSalesUsersLoading) setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const commissionsQuery = query(collection(firestore, 'commissions'), where('userId', 'in', targetUserIds));
    const unsubCommissions = onSnapshot(commissionsQuery, (snapshot) => {
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
    }, (e: FirestoreError) => {
        const permissionError = new FirestorePermissionError({ path: 'commissions', operation: 'list' });
        errorEmitter.emit('permission-error', permissionError);
        console.error("Error fetching commissions:", e);
        setError(permissionError);
    });
    
    const clientQuery = query(collection(firestore, 'clients'));
    const unsubClients = onSnapshot(clientQuery, (snapshot) => {
        const allClients: WithId<Client>[] = [];
        snapshot.forEach(doc => allClients.push({ id: doc.id, ...doc.data() } as WithId<Client>));
        setClients(allClients);
    }, (e: FirestoreError) => {
        const permissionError = new FirestorePermissionError({ path: 'clients', operation: 'list' });
        errorEmitter.emit('permission-error', permissionError);
        console.error("Error fetching clients:", e);
        setError(permissionError);
    });

    const proposalQuery = query(collectionGroup(firestore, 'proposals'));
     const unsubProposals = onSnapshot(proposalQuery, (snapshot) => {
        const allProposals: WithId<Proposal>[] = [];
        snapshot.forEach(doc => {
             const proposalData = doc.data() as Omit<Proposal, 'id'>;
            let createdAtString: string;
            if (proposalData.createdAt && typeof (proposalData.createdAt as any).toDate === 'function') {
                createdAtString = (proposalData.createdAt as any).toDate().toISOString();
            } else {
                createdAtString = proposalData.createdAt as string;
            }
            allProposals.push({
                ...(proposalData as Proposal),
                id: doc.id,
                clientId: doc.ref.parent.parent?.id || '',
                createdAt: createdAtString,
            });
        });
        setProposals(allProposals);
        setIsLoading(false);
    }, (e: FirestoreError) => {
        const permissionError = new FirestorePermissionError({ path: 'proposals', operation: 'list' });
        errorEmitter.emit('permission-error', permissionError);
        console.error("Error fetching proposals:", e);
        setError(permissionError);
        setIsLoading(false);
    });


    return () => {
        unsubCommissions();
        unsubClients();
        unsubProposals();
    };

  }, [firestore, isFirebaseLoading, isUserAuthLoading, isSalesUsersLoading, JSON.stringify(targetUserIds)]);
  
    const allPayouts = useMemo(() => {
        if (isLoading) return [];
        
        const commissionsByMonthAndUser: Record<string, Record<string, WithId<PayoutCommission>[]>> = {};

        commissions.forEach(commission => {
            if(!commission.createdAt) return;
            const monthKey = format(startOfMonth(new Date(commission.createdAt)), 'MMMM yyyy');
            const userId = commission.userId;
            
            if (!commissionsByMonthAndUser[monthKey]) {
                commissionsByMonthAndUser[monthKey] = {};
            }
            if (!commissionsByMonthAndUser[monthKey][userId]) {
                commissionsByMonthAndUser[monthKey][userId] = [];
            }
            commissionsByMonthAndUser[monthKey][userId].push(commission);
        });

        const processedPayouts: MonthlyPayout[] = [];

        Object.keys(commissionsByMonthAndUser).forEach(month => {
            Object.keys(commissionsByMonthAndUser[month]).forEach(userId => {
                const userCommissions = commissionsByMonthAndUser[month][userId];
                const totalAmount = userCommissions.reduce((sum, c) => sum + c.amount, 0);
                if (totalAmount === 0) return;
                
                const allPaid = !userCommissions.some(c => c.status === 'pending');
                const status = allPaid ? 'paid' : 'pending';
                const userIdForTx = userId.slice(0, 4).toUpperCase();
                
                processedPayouts.push({
                    month,
                    totalAmount,
                    status,
                    timelineStatus: allPaid ? 'paid' : 'calculated',
                    commissions: userCommissions,
                    transactionId: `SR-PO-${new Date(month).getFullYear()}${String(new Date(month).getMonth() + 1).padStart(2, '0')}-${userIdForTx}`
                });
            });
        });

        processedPayouts.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
        return processedPayouts;
    }, [commissions, isLoading]);

    const availableYears = useMemo(() => {
        const yearSet = new Set<string>();
        allPayouts.forEach(payout => {
            const date = new Date(payout.month);
            yearSet.add(date.getFullYear().toString());
        });
        return Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a));
    }, [allPayouts]);

    const combinedIsLoading = isLoading || isFirebaseLoading || isUserAuthLoading || isSalesUsersLoading;

    return { allPayouts, commissions, clients, proposals, isLoading: combinedIsLoading, error, availableYears };
}
