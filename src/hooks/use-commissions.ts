
'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import type { Commission, Client, Proposal } from '@/lib/definitions';
import { WithId } from '@/firebase/firestore/use-collection';
import { format, startOfMonth, isWithinInterval, addYears, parseISO } from 'date-fns';
import type { FinalPlanDetails } from '@/components/contract-details';

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
  const { user: authUser, isUserLoading: isUserAuthLoading } = useUser();
  
  const [commissions, setCommissions] = useState<WithId<Commission>[]>([]);
  const [clients, setClients] = useState<WithId<Client>[]>([]);
  const [proposals, setProposals] = useState<WithId<Proposal>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetUserId = userId || authUser?.uid;

  useEffect(() => {
    if (!targetUserId || !firestore || isFirebaseLoading) {
      return;
    }

    setIsLoading(true);

    const commissionsQuery = query(collection(firestore, 'commissions'), where('userId', '==', targetUserId));
    const clientQuery = query(collection(firestore, 'clients'), where('userId', '==', targetUserId));

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
        setIsLoading(false);
    });

    const unsubClients = onSnapshot(clientQuery, (snapshot) => {
        const userClients: WithId<Client>[] = [];
        snapshot.forEach(doc => userClients.push({ id: doc.id, ...doc.data() } as WithId<Client>));
        setClients(userClients);
    }, (e) => {
        console.error("Error fetching clients:", e);
        setError(e);
        setIsLoading(false);
    });
    
    // Fetch all proposals for the user's clients
    const fetchProposals = async () => {
        if (clients.length > 0) {
            const allProposals: WithId<Proposal>[] = [];
            for (const client of clients) {
                const proposalsRef = collection(firestore, `clients/${client.id}/proposals`);
                const proposalsQuery = query(proposalsRef, where('userId', '==', targetUserId));
                
                const unsub = onSnapshot(proposalsQuery, (snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        const proposalData = change.doc.data() as Omit<Proposal, 'id'>;
                        let createdAtString: string;
                        if (proposalData.createdAt && typeof (proposalData.createdAt as any).toDate === 'function') {
                            createdAtString = (proposalData.createdAt as any).toDate().toISOString();
                        } else {
                            createdAtString = proposalData.createdAt as string;
                        }
                        const newProposal = {
                            ...(proposalData as Proposal),
                            id: change.doc.id,
                            clientId: client.id,
                            createdAt: createdAtString,
                        };

                        if (change.type === "added") {
                             setProposals(prev => [...prev, newProposal]);
                        }
                        if (change.type === "modified") {
                             setProposals(prev => prev.map(p => p.id === newProposal.id ? newProposal : p));
                        }
                        if (change.type === "removed") {
                            setProposals(prev => prev.filter(p => p.id !== change.doc.id));
                        }
                    });
                     setIsLoading(false);
                }, (e) => {
                    console.error(`Error fetching proposals for client ${client.id}:`, e);
                    setError(e as Error);
                    setIsLoading(false);
                });
                // In a real app you'd manage these unsubscribes
            }
        } else {
            setIsLoading(false);
        }
    };
    
    fetchProposals();

    return () => {
        unsubCommissions();
        unsubClients();
    };

  }, [firestore, targetUserId, isFirebaseLoading, clients.length]); // Added clients.length to re-trigger proposal fetch
  
    const allPayouts = useMemo(() => {
        if (isLoading) return [];
        
        const clientMap = new Map(clients.map(client => [client.id, client]));

        const now = new Date();
        const currentMonthKey = format(startOfMonth(now), 'MMMM yyyy');
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = new Date();

        const commissionRates: { [key: string]: number } = {
            household: 0.12, sme: 0.12, commercial: 0.10, corporate: 0.10, enterprise: 0.08,
        };
        const recurringCommissionRate = 0.03;
        
        const currentMonthCommissions: WithId<PayoutCommission>[] = [];

        const acceptedThisMonth = proposals.filter(p => {
            if (!p.createdAt) return false;
            const createdAt = new Date(p.createdAt);
            return p.status === 'accepted' && isWithinInterval(createdAt, { start: currentMonthStart, end: currentMonthEnd });
        });

        acceptedThisMonth.forEach(proposal => {
            const client = clientMap.get(proposal.clientId);
            if (!client || !client.clientType) return;
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
        });

        const oneYearAgo = addYears(now, -1);
        const activeClients = clients.filter(c => c.status === 'active' && c.clientType !== 'household');
        activeClients.forEach(client => {
             const acceptedProposalForClient = proposals.find(p => p.clientId === client.id && p.status === 'accepted');
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
                 if (monthlyPayout > 0) {
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
            return client && ['sme', 'commercial', 'corporate', 'enterprise'].includes(client.clientType || '');
        }).length;

        const householdClientsThisMonth = acceptedThisMonth.filter(p => {
            const client = clientMap.get(p.clientId);
            return client && client.clientType === 'household';
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


        const commissionsByMonth = commissions.reduce((acc, commission) => {
            const monthKey = format(startOfMonth(new Date(commission.createdAt)), 'MMMM yyyy');
            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push(commission);
            return acc;
        }, {} as Record<string, WithId<PayoutCommission>[]>);

        if (!commissionsByMonth[currentMonthKey]) {
            commissionsByMonth[currentMonthKey] = [];
        }
        
        commissionsByMonth[currentMonthKey].push(...currentMonthCommissions);

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
                transactionId: `SR-PO-${new Date(month).getFullYear()}${String(new Date(month).getMonth() + 1).padStart(2, '0')}-${authUser?.id.slice(0, 4).toUpperCase()}`
            };
        });

        processedPayouts.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
        return processedPayouts;
    }, [commissions, clients, proposals, isLoading, authUser]);

    const availableYears = useMemo(() => {
        const yearSet = new Set<string>();
        allPayouts.forEach(payout => {
            const date = new Date(payout.month);
            yearSet.add(date.getFullYear().toString());
        });
        return Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a));
    }, [allPayouts]);

    const combinedIsLoading = isLoading || isFirebaseLoading || isUserAuthLoading;

    return { allPayouts, commissions, clients, proposals, isLoading: combinedIsLoading, error, availableYears };
}
