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
                const updatedCommissions = prevCommissions.map(pc => {
                    const updated = fetchedCommissions.find(fc => fc.id === pc.id);
                    return updated ? updated : pc;
                });
                return [...updatedCommissions, ...newCommissions];
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
    if (isLoading || proposalsLoading || clientsLoading || isSalesUsersLoading) return [];
    
    const commissionsByMonth: Record<string, WithId<PayoutCommission>[]> = {};
    const clientMap = new Map(allClients.map(c => [c.id, c]));
    
    // Process existing commissions
    commissions.forEach(commission => {
        if(!commission.createdAt) return;
        const monthKey = format(startOfMonth(new Date(commission.createdAt)), 'MMMM yyyy');
        if (!commissionsByMonth[monthKey]) {
            commissionsByMonth[monthKey] = [];
        }
        const clientName = allProposals.find(p => p.id === commission.proposalId)?.clientId
        commissionsByMonth[monthKey].push({...commission, clientName: clientMap.get(clientName || '')?.companyName});
    });

    // Dynamically calculate and add recurring commissions for all relevant users
    const userIdsWithSales = new Set(allProposals.filter(p => p.status === 'accepted').map(p => p.userId));
    
    userIdsWithSales.forEach(uId => {
      const userProposals = allProposals.filter(p => p.status === 'accepted' && p.createdAt && p.userId === uId);
      const recurringCommissionRates: { [key: string]: number } = { household: 0, sme: 0.03, commercial: 0.03, corporate: 0.03, enterprise: 0.03 };
      
      userProposals.forEach(proposal => {
          const client = clientMap.get(proposal.clientId);
          if (!client || !client.clientType) return;
          const rate = recurringCommissionRates[client.clientType];
          if (rate === 0) return;
          const startDate = parseISO(proposal.createdAt);
          const today = new Date();

          for (let i = 0; i < 12; i++) {
              const commissionMonthDate = addMonths(startDate, i);
              if (commissionMonthDate > today) break;
              
              const monthKey = format(commissionMonthDate, 'MMMM yyyy');
              if (!commissionsByMonth[monthKey]) {
                  commissionsByMonth[monthKey] = [];
              }
              
              const recurringId = `recurring-${proposal.id}-${i}`;
              if (!commissionsByMonth[monthKey].some(c => c.id === recurringId)) {
                  commissionsByMonth[monthKey].push({
                      id: recurringId,
                      userId: proposal.userId,
                      proposalId: proposal.id,
                      amount: proposal.amount * rate,
                      createdAt: commissionMonthDate.toISOString(),
                      status: 'pending',
                      type: 'commission',
                      description: `Recurring (${i + 1}/12)`,
                      clientName: client.companyName,
                      referenceId: `recurring-${proposal.id}`
                  });
              }
          }
      });
    });


    const processedPayouts: MonthlyPayout[] = [];
    const targetUserId = userId || authUser?.id;
    const userIdsToInclude = (isManager && !userId) ? [targetUserId, ...teamMemberIds] : [targetUserId];

    Object.keys(commissionsByMonth).forEach(month => {
        const userSpecificCommissions = commissionsByMonth[month].filter(c => userIdsToInclude.includes(c.userId));
        
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
}, [commissions, isLoading, proposalsLoading, clientsLoading, userId, authUser, isManager, teamMemberIds, allProposals, allClients, salesUsers, isSalesUsersLoading]);


    const availableYears = useMemo(() => {
        const yearSet = new Set<string>();
        allPayouts.forEach(payout => {
            const date = new Date(payout.month);
            yearSet.add(date.getFullYear().toString());
        });
        return Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a));
    }, [allPayouts]);

    const combinedIsLoading = isLoading || isFirebaseLoading || isUserAuthLoading || isSalesUsersLoading || proposalsLoading || clientsLoading;

    return { allPayouts, commissions, isLoading: combinedIsLoading, error, availableYears };
}
