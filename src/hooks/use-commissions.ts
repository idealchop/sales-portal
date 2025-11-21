

'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, onSnapshot, getDocs, collectionGroup } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
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

export function useCommissions(userIds?: string | string[]) {
  const { firestore, isFirebaseLoading } = useFirebase();
  const { user: authUser, isUserLoading: isUserAuthLoading, isManager } = useUser();
  const { salesUsers, isLoading: isSalesUsersLoading } = useSalesUsers();
  
  const [commissions, setCommissions] = useState<WithId<Commission>[]>([]);
  const [clients, setClients] = useState<WithId<Client>[]>([]);
  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetUserIds = useMemo(() => {
    // If a specific user ID (or IDs) is passed, use it.
    if (Array.isArray(userIds) && userIds.length > 0) return userIds;
    if (typeof userIds === 'string') return [userIds];
    
    // If the current user is a manager and no specific ID is passed,
    // fetch for the manager and all their team members.
    if (authUser && isManager && salesUsers.length > 0) {
        const managerTeamName = `${authUser.location} (${authUser.displayName})`;
        const teamMemberIds = salesUsers
            .filter(u => u.team === managerTeamName)
            .map(u => u.id);
        return [authUser.id, ...teamMemberIds];
    }
    
    // For a regular sales user, or if nothing else matches, fetch for the logged-in user.
    if (authUser) return [authUser.id];

    return [];
  }, [userIds, authUser, isManager, salesUsers]);

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
    }, (e) => {
        console.error("Error fetching commissions:", e);
        setError(e);
    });
    
    const clientQuery = query(collection(firestore, 'clients'));
    const unsubClients = onSnapshot(clientQuery, (snapshot) => {
        const allClients: WithId<Client>[] = [];
        snapshot.forEach(doc => allClients.push({ id: doc.id, ...doc.data() } as WithId<Client>));
        setClients(allClients);
    }, (e) => {
        console.error("Error fetching clients:", e);
        setError(e);
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
    }, (e) => {
        console.error("Error fetching proposals:", e);
        setError(e);
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
        
        const clientMap = new Map(clients.map(client => [client.id, client]));

        const now = new Date();
        
        const relevantProposals = proposals.filter(p => targetUserIds.includes(p.userId));
        const acceptedProposals = relevantProposals.filter(p => p.status === 'accepted');

        const oneYearAgo = addYears(now, -1);
        const activeClients = clients.filter(c => targetUserIds.includes(c.userId) && c.status === 'active' && c.clientType !== 'household');
        
        // For a manager, we only want to show commissions assigned to them (direct or overrides)
        const commissionsToShow = isManager
          ? commissions.filter(c => c.userId === authUser?.id)
          : commissions;

        const commissionsByMonth = commissionsToShow.reduce((acc, commission) => {
                const monthKey = format(startOfMonth(new Date(commission.createdAt)), 'MMMM yyyy');
                if (!acc[monthKey]) acc[monthKey] = [];
                acc[monthKey].push(commission);
                return acc;
            }, {} as Record<string, WithId<PayoutCommission>[]>);

        const processedPayouts: MonthlyPayout[] = Object.keys(commissionsByMonth).map(month => {
            const monthCommissions = commissionsByMonth[month] || [];
            const uniqueCommissions = Array.from(new Map(monthCommissions.map(c => [c.id, c])).values());
            
            const totalAmount = uniqueCommissions.reduce((sum, c) => sum + c.amount, 0);
            
            const allPaid = !uniqueCommissions.some(c => c.status === 'pending');
            const status = allPaid ? 'paid' : 'pending';
            
            const userIdForTx = uniqueCommissions[0]?.userId.slice(0,4).toUpperCase() || 'NA';

            return { 
                month, 
                totalAmount, 
                status, 
                timelineStatus: allPaid ? 'paid' : 'calculated',
                commissions: uniqueCommissions,
                transactionId: `SR-PO-${new Date(month).getFullYear()}${String(new Date(month).getMonth() + 1).padStart(2, '0')}-${userIdForTx}`
            };
        });

        processedPayouts.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
        return processedPayouts;
    }, [commissions, clients, proposals, isLoading, targetUserIds, isManager, authUser?.id]);

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
