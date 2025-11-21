
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

export function useCommissions(userId?: string) {
  const { firestore, isFirebaseLoading } = useFirebase();
  const { user: authUser, isUserLoading: isUserAuthLoading, isManager } = useUser();
  const { salesUsers, isLoading: isSalesUsersLoading } = useSalesUsers();
  
  const [commissions, setCommissions] = useState<WithId<Commission>[]>([]);
  const [clients, setClients] = useState<WithId<Client>[]>([]);
  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetUser = useMemo(() => {
    if (userId) return salesUsers.find(u => u.id === userId);
    return authUser;
  }, [userId, authUser, salesUsers]);

  const teamMembers = useMemo(() => {
    if (!targetUser || targetUser.role !== 'manager') return [];
    const managerTeamName = `${targetUser.location} (${targetUser.displayName})`;
    return salesUsers.filter(u => u.team === managerTeamName);
  }, [targetUser, salesUsers]);
  
  const isManagerView = targetUser?.role === 'manager';

  useEffect(() => {
    if (!targetUser || !firestore || isFirebaseLoading) {
      return;
    }

    setIsLoading(true);

    const userIdsToFetch = isManagerView 
      ? [targetUser.id, ...teamMembers.map(tm => tm.id)]
      : [targetUser.id];
    
    if (userIdsToFetch.length === 0 && isManagerView) {
        setIsLoading(false);
        return;
    }

    const commissionsQuery = query(collection(firestore, 'commissions'), where('userId', 'in', userIdsToFetch));
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
        if(!unsubClients && !unsubProposals) setIsLoading(false);
    }, (e) => {
        console.error("Error fetching commissions:", e);
        setError(e);
        setIsLoading(false);
    });
    
    const clientQuery = query(collection(firestore, 'clients'));
    const unsubClients = onSnapshot(clientQuery, (snapshot) => {
        const allClients: WithId<Client>[] = [];
        snapshot.forEach(doc => allClients.push({ id: doc.id, ...doc.data() } as WithId<Client>));
        setClients(allClients);
        if(!unsubCommissions && !unsubProposals) setIsLoading(false);
    }, (e) => {
        console.error("Error fetching clients:", e);
        setError(e);
        setIsLoading(false);
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
        if(!unsubCommissions && !unsubClients) setIsLoading(false);
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

  }, [firestore, targetUser, isFirebaseLoading, teamMembers, isManagerView]);
  
    const allPayouts = useMemo(() => {
        if (isLoading || !targetUser) return [];
        
        const clientMap = new Map(clients.map(client => [client.id, client]));

        const now = new Date();
        const currentMonthKey = format(startOfMonth(now), 'MMMM yyyy');
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = new Date();

        const commissionRates: { [key: string]: number } = {
            household: 0.12, sme: 0.12, commercial: 0.10, corporate: 0.10, enterprise: 0.08,
        };
        const managerOverrideRates: { [key: string]: number } = {
            household: 0.02, sme: 0.03, commercial: 0.03, corporate: 0.03, enterprise: 0.03
        };
        const recurringCommissionRate = 0.03;
        
        const currentMonthCommissions: WithId<PayoutCommission>[] = [];
        
        const userIdsToProcess = isManagerView 
            ? [targetUser.id, ...teamMembers.map(tm => tm.id)]
            : [targetUser.id];

        const relevantProposals = proposals.filter(p => userIdsToProcess.includes(p.userId));
        const acceptedProposals = relevantProposals.filter(p => p.status === 'accepted');

        const acceptedThisMonth = acceptedProposals.filter(p => {
            if (!p.createdAt) return false;
            const createdAt = new Date(p.createdAt);
            return isWithinInterval(createdAt, { start: currentMonthStart, end: currentMonthEnd });
        });

        acceptedThisMonth.forEach(proposal => {
            const client = clientMap.get(proposal.clientId);
            if (!client || !client.clientType) return;

            // Direct commission for the sales executive
            if (proposal.userId === targetUser.id || !isManagerView) {
                const rate = commissionRates[client.clientType] || 0;
                const commissionAmount = proposal.amount * rate;
                if (commissionAmount > 0) {
                     currentMonthCommissions.push({
                        id: `otc-${proposal.id}`,
                        amount: commissionAmount,
                        createdAt: proposal.createdAt,
                        description: `One-time commission`,
                        clientName: client.companyName,
                        proposalId: proposal.id,
                        status: 'pending',
                        type: 'commission',
                        userId: proposal.userId,
                        referenceId: proposal.id,
                     });
                }
            }
            
            // Manager override commission
            if (isManagerView && teamMembers.some(tm => tm.id === proposal.userId)) {
                 const overrideRate = managerOverrideRates[client.clientType] || 0;
                 const overrideAmount = proposal.amount * overrideRate;
                 if (overrideAmount > 0) {
                     currentMonthCommissions.push({
                         id: `mgr-ovr-${proposal.id}`,
                         amount: overrideAmount,
                         createdAt: proposal.createdAt,
                         description: `Manager Override`,
                         clientName: client.companyName,
                         proposalId: proposal.id,
                         status: 'pending',
                         type: 'commission',
                         userId: targetUser.id, 
                         referenceId: proposal.id,
                     });
                 }
            }
        });

        const oneYearAgo = addYears(now, -1);
        const activeClients = clients.filter(c => userIdsToProcess.includes(c.userId) && c.status === 'active' && c.clientType !== 'household');
        
        activeClients.forEach(client => {
             const acceptedProposalForClient = acceptedProposals.find(p => p.clientId === client.id);
             if (!acceptedProposalForClient || !acceptedProposalForClient.content) return;
             try {
                const proposalContent = JSON.parse(acceptedProposalForClient.content) as FinalPlanDetails;
                if (!proposalContent.date) return;
                const dateSigned = parseISO(proposalContent.date);
                if (dateSigned < oneYearAgo) return;

                const monthlyFee = proposalContent.basePrice || 0;
                const annualValue = monthlyFee * 12;
                const totalCommission = annualValue * recurringCommissionRate;
                const monthlyPayout = totalCommission / 12;

                if (monthlyPayout > 0 && (acceptedProposalForClient.userId === targetUser.id || !isManagerView)) {
                    currentMonthCommissions.push({
                        id: `rec-${client.id}`,
                        amount: monthlyPayout,
                        createdAt: now.toISOString(),
                        description: `Recurring commission`,
                        clientName: client.companyName,
                        proposalId: acceptedProposalForClient.id,
                        status: 'pending',
                        type: 'commission',
                        userId: acceptedProposalForClient.userId,
                        referenceId: client.id,
                    });
                }
            } catch {}
        });

        const corporateBonusTiers = [
            { target: 3, name: 'Corporate Closer I', bonus: 2000 },
            { target: 5, name: 'Corporate Closer II', bonus: 5000 },
            { target: 10, name: 'Corporate Closer III', bonus: 12000 },
        ];
        const familyBonusTiers = [
            { target: 10, name: 'Family Plan Closer I', bonus: 2500 },
            { target: 20, name: 'Family Plan Closer II', bonus: 6000 },
            { target: 30, name: 'Family Plan Closer III', bonus: 15000 },
        ];

        const corpClientsThisMonth = acceptedThisMonth.filter(p => {
            const client = clientMap.get(p.clientId);
            return p.userId === targetUser.id && client && ['sme', 'commercial', 'corporate', 'enterprise'].includes(client.clientType || '');
        }).length;

        const householdClientsThisMonth = acceptedThisMonth.filter(p => {
            const client = clientMap.get(p.clientId);
            return p.userId === targetUser.id && client && client.clientType === 'household';
        }).length;
        
        corporateBonusTiers.forEach(tier => {
            if (corpClientsThisMonth >= tier.target) {
                currentMonthCommissions.push({
                    id: `bonus-corp-${tier.target}`, amount: tier.bonus, createdAt: now.toISOString(),
                    description: tier.name, clientName: 'N/A', proposalId: 'N/A',
                    status: 'pending', type: 'bonus', userId: authUser?.id || '', referenceId: `bonus-corp-${tier.target}`
                });
            }
        });
         familyBonusTiers.forEach(tier => {
            if (householdClientsThisMonth >= tier.target) {
                currentMonthCommissions.push({
                    id: `bonus-fam-${tier.target}`, amount: tier.bonus, createdAt: now.toISOString(),
                    description: tier.name, clientName: 'N/A', proposalId: 'N/A',
                    status: 'pending', type: 'bonus', userId: authUser?.id || '', referenceId: `bonus-fam-${tier.target}`
                });
            }
        });


        const commissionsByMonth = commissions
            .filter(c => isManagerView ? true : c.userId === targetUser.id)
            .reduce((acc, commission) => {
                const monthKey = format(startOfMonth(new Date(commission.createdAt)), 'MMMM yyyy');
                if (!acc[monthKey]) acc[monthKey] = [];
                acc[monthKey].push(commission);
                return acc;
            }, {} as Record<string, WithId<PayoutCommission>[]>);

        if (!commissionsByMonth[currentMonthKey]) {
            commissionsByMonth[currentMonthKey] = [];
        }
        
        const targetCommissions = currentMonthCommissions.filter(c => isManagerView ? true : c.userId === targetUser.id);
        commissionsByMonth[currentMonthKey].push(...targetCommissions);

        const processedPayouts: MonthlyPayout[] = Object.keys(commissionsByMonth).map(month => {
            const monthCommissions = commissionsByMonth[month] || [];
            const uniqueCommissions = Array.from(new Map(monthCommissions.map(c => [c.id, c])).values());
            
            const totalAmount = uniqueCommissions.reduce((sum, c) => sum + c.amount, 0);
            
            const allPaid = uniqueCommissions.every(c => c.status === 'paid');
            const status = allPaid ? 'paid' : 'pending';
            
            return { 
                month, 
                totalAmount, 
                status, 
                timelineStatus: allPaid ? 'paid' : 'calculated',
                commissions: uniqueCommissions,
                transactionId: `SR-PO-${new Date(month).getFullYear()}${String(new Date(month).getMonth() + 1).padStart(2, '0')}-${targetUser.id.slice(0, 4).toUpperCase()}`
            };
        });

        processedPayouts.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
        return processedPayouts;
    }, [commissions, clients, proposals, isLoading, targetUser, isManagerView, teamMembers]);

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
