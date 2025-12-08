
'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, onSnapshot, getDocs, collectionGroup, FirestoreError } from 'firebase/firestore';
import { useFirebase, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { Commission, Client, Proposal, UserProfile } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';
import { format, startOfMonth, isWithinInterval, addYears, parseISO, differenceInMonths, addMonths } from 'date-fns';
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
    } 
    else if (authUser) { 
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
                const existingIds = new Set(prevCommissions.map(c => c.id));
                const newCommissions = fetchedCommissions.filter(c => !existingIds.has(c.id));
                return [...prevCommissions, ...newCommissions];
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

  }, [firestore, isFirebaseLoading, userId, isManager, teamMemberIds, authUser, isUserAuthLoading]);
  
    const allPayouts = useMemo(() => {
        if (isLoading || proposalsLoading || clientsLoading) return [];
        
        const commissionsByMonth: Record<string, WithId<PayoutCommission>[]> = {};
        const clientMap = new Map(allClients.map(c => [c.id, c]));
        
        // Process existing commissions from Firestore
        commissions.forEach(commission => {
            if(!commission.createdAt) return;
            const monthKey = format(startOfMonth(new Date(commission.createdAt)), 'MMMM yyyy');
            if (!commissionsByMonth[monthKey]) {
                commissionsByMonth[monthKey] = [];
            }
            const proposal = allProposals.find(p => p.id === commission.proposalId);
            const clientName = clientMap.get(proposal?.clientId)?.companyName;

            // Avoid duplicating commissions
            if (!commissionsByMonth[monthKey].some(c => c.id === commission.id)) {
                commissionsByMonth[monthKey].push({...commission, clientName});
            }
        });

        // Dynamically calculate and add recurring commissions
        const recurringCommissionRates: { [key: string]: number } = { household: 0, sme: 0.03, commercial: 0.03, corporate: 0.03, enterprise: 0.03 };
        const relevantProposals = allProposals.filter(p => p.status === 'accepted' && p.createdAt && (p.userId === authUser?.id || teamMemberIds.includes(p.userId)));

        relevantProposals.forEach(proposal => {
            const client = clientMap.get(proposal.clientId);
            if (!client || !client.clientType) return;
            
            const rate = recurringCommissionRates[client.clientType];
            if (rate === 0) return;

            const startDate = parseISO(proposal.createdAt);
            const today = new Date();

            for (let i = 0; i < 12; i++) {
                const commissionMonthDate = addMonths(startDate, i);

                if (commissionMonthDate > today) {
                    break; // Stop if the commission month is in the future
                }

                const monthKey = format(commissionMonthDate, 'MMMM yyyy');
                if (!commissionsByMonth[monthKey]) {
                    commissionsByMonth[monthKey] = [];
                }

                const recurringCommissionId = `recurring-${proposal.id}-${i}`;
                
                // Check if this recurring commission has already been added
                if (!commissionsByMonth[monthKey].some(c => c.id === recurringCommissionId)) {
                    const recurringCommissionAmount = proposal.amount * rate;
                    commissionsByMonth[monthKey].push({
                        id: recurringCommissionId,
                        userId: proposal.userId,
                        proposalId: proposal.id,
                        amount: recurringCommissionAmount,
                        createdAt: commissionMonthDate.toISOString(),
                        status: 'pending', // Assume pending; will be reconciled with paid status later if needed
                        type: 'commission',
                        description: `Recurring (${i + 1}/12)`,
                        clientName: client.companyName,
                        referenceId: `recurring-${proposal.id}`
                    });
                }
            }
        });


        const processedPayouts: MonthlyPayout[] = [];
        const targetUserId = userId || authUser?.id;

        Object.keys(commissionsByMonth).forEach(month => {
            const monthCommissions = commissionsByMonth[month];
            
            const userSpecificCommissions = monthCommissions.filter(c => c.userId === targetUserId);
            
            if (userSpecificCommissions.length === 0) return;
            
            const totalAmount = userSpecificCommissions.reduce((sum, c) => sum + c.amount, 0);

            const allPaid = !userSpecificCommissions.some(c => c.status === 'pending');
            const status = allPaid ? 'paid' : 'pending';
            
            const userIdForTx = targetUserId?.slice(0, 4).toUpperCase() || 'USER';
            
            processedPayouts.push({
                month,
                totalAmount,
                status,
                timelineStatus: allPaid ? 'paid' : 'calculated',
                commissions: userSpecificCommissions,
                transactionId: `SR-PO-${new Date(month).getFullYear()}${String(new Date(month).getMonth() + 1).padStart(2, '0')}-${userIdForTx}`
            });
        });

        processedPayouts.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
        return processedPayouts;
    }, [commissions, isLoading, proposalsLoading, clientsLoading, userId, authUser, allProposals, allClients, teamMemberIds]);

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
