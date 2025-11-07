
'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from '@/lib/utils';
import { format, startOfMonth } from 'date-fns';
import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from './ui/badge';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useProposals } from '@/hooks/use-proposals';
import { useClients } from '@/hooks/use-clients';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CheckCircle, Clock, Loader2, Award, Star, Trophy } from 'lucide-react';
import type { Commission } from '@/lib/definitions';
import { doc, collection, query, where, getDocs } from "firebase/firestore";

type MonthlyPayout = {
    month: string;
    totalAmount: number;
    status: 'paid' | 'pending';
    commissions: Commission[];
    bonuses: { name: string; bonus: number }[];
};

function PayoutMonthDetailsDialog({ month, commissions, bonuses }: { month: string, commissions: Commission[], bonuses: {name: string, bonus: number}[] }) {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    
    return (
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Payout Details for {month}</DialogTitle>
                <DialogDescription>
                    Detailed breakdown of commissions and bonuses for this period.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[50vh] pr-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date / Type</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bonuses.map((bonus, index) => (
                             <TableRow key={`bonus-${index}`}>
                                <TableCell>Bonus</TableCell>
                                <TableCell className="font-semibold">{bonus.name}</TableCell>
                                <TableCell>
                                    <Badge variant='success' className="capitalize">
                                        Achieved
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-semibold">{currencyFormatter.format(bonus.bonus)}</TableCell>
                            </TableRow>
                        ))}
                        {commissions.map((commission) => (
                            <TableRow key={commission.id}>
                                <TableCell>{new Date(commission.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell className="font-mono text-xs">{commission.proposalId}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={commission.status === 'paid' ? 'success' : 'warning'}
                                        className="capitalize"
                                    >
                                        {commission.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-semibold">{currencyFormatter.format(commission.amount)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </DialogContent>
    );
}

function PaymentTimelineDialog({ month, status, totalAmount }: { month: string, status: 'paid' | 'pending', totalAmount: number }) {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

    const timelineSteps = [
        { name: 'Calculation', description: 'Commissions and bonuses tallied.', isComplete: true },
        { name: 'Review', description: 'Payouts verified by finance.', isComplete: true },
        { name: 'Processing', description: 'Sent to payment provider.', isComplete: status === 'paid' },
        { name: 'Paid', description: 'Funds deposited to your account.', isComplete: status === 'paid' },
    ];

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Payout Timeline for {month}</DialogTitle>
                <DialogDescription>
                    Status for your payout of <span className="font-bold text-primary">{currencyFormatter.format(totalAmount)}</span>.
                </DialogDescription>
            </DialogHeader>
            <div className="py-6">
                <ul className="space-y-4">
                    {timelineSteps.map((step, index) => (
                        <li key={step.name} className="flex items-start gap-4">
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-full ring-4 ring-background",
                                    step.isComplete ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-700"
                                )}>
                                    {step.isComplete ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" /> : <Clock className="h-5 w-5 text-gray-500" />}
                                </div>
                                {index < timelineSteps.length - 1 && (
                                    <div className={cn(
                                        "h-12 w-px",
                                        step.isComplete ? "bg-green-300" : "bg-border"
                                    )}></div>
                                )}
                            </div>
                            <div>
                                <h4 className="font-semibold">{step.name}</h4>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </DialogContent>
    )
}

export function PayoutHistoryDialog({ children }: { children: React.ReactNode }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { proposals, isLoading: proposalsLoading } = useProposals();
    const { clients, isLoading: clientsLoading } = useClients();
    const clientMap = useMemo(() => new Map(clients.map(client => [client.id, client])), [clients]);

    const [allPayouts, setAllPayouts] = useState<MonthlyPayout[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

    useEffect(() => {
        const fetchAndProcessData = async () => {
            if (!user || !firestore || proposalsLoading || clientsLoading) return;
            setIsLoading(true);

            try {
                // 1. Fetch Commissions
                const commissionsRef = collection(firestore, 'commissions');
                const q = query(commissionsRef, where('userId', '==', user.uid));
                const querySnapshot = await getDocs(q);
                
                const commissions: Commission[] = [];
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    let createdAtString: string;
                    if (data.createdAt && typeof (data.createdAt as any).toDate === 'function') {
                        createdAtString = (data.createdAt as any).toDate().toISOString();
                    } else {
                        createdAtString = data.createdAt as string;
                    }
                    commissions.push({ id: doc.id, ...data, createdAt: createdAtString } as Commission);
                });

                const commissionsByMonth = commissions.reduce((acc, commission) => {
                    const monthKey = format(startOfMonth(new Date(commission.createdAt)), 'MMMM yyyy');
                    if (!acc[monthKey]) {
                        acc[monthKey] = [];
                    }
                    acc[monthKey].push(commission);
                    return acc;
                }, {} as Record<string, Commission[]>);
                
                // 2. Calculate Bonuses
                const acceptedProposals = proposals.filter(p => p.status === 'accepted' && p.createdAt);
                const monthlyClientCounts: { [key: string]: { corporate: number, household: number } } = {};
                
                for (const proposal of acceptedProposals) {
                    const date = new Date(proposal.createdAt);
                    const monthYear = format(date, 'MMMM yyyy');
                    
                    if (!monthlyClientCounts[monthYear]) {
                        monthlyClientCounts[monthYear] = { corporate: 0, household: 0 };
                    }

                    const client = clientMap.get(proposal.clientId);
                    if (!client) continue;

                    if (['sme', 'commercial', 'corporate', 'enterprise'].includes(client.clientType || '')) {
                        monthlyClientCounts[monthYear].corporate++;
                    } else if (client.clientType === 'household') {
                        monthlyClientCounts[monthYear].household++;
                    }
                }
                
                const bonusesByMonth: Record<string, { name: string; bonus: number }[]> = {};
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
                
                for (const monthYear in monthlyClientCounts) {
                    const { corporate, household } = monthlyClientCounts[monthYear];
                    bonusesByMonth[monthYear] = bonusesByMonth[monthYear] || [];
                    
                    corporateBonusTiers.forEach(tier => {
                        if(corporate >= tier.target) {
                             bonusesByMonth[monthYear].push({ name: tier.name, bonus: tier.bonus });
                        }
                    });
                     familyBonusTiers.forEach(tier => {
                        if(household >= tier.target) {
                             bonusesByMonth[monthYear].push({ name: tier.name, bonus: tier.bonus });
                        }
                    });
                }

                // 3. Combine Commissions and Bonuses
                const allMonths = new Set([...Object.keys(commissionsByMonth), ...Object.keys(bonusesByMonth)]);
                
                const processedPayouts: MonthlyPayout[] = Array.from(allMonths).map(month => {
                    const monthCommissions = commissionsByMonth[month] || [];
                    const monthBonuses = bonusesByMonth[month] || [];
                    
                    const commissionTotal = monthCommissions.reduce((sum, c) => sum + c.amount, 0);
                    const bonusTotal = monthBonuses.reduce((sum, b) => sum + b.bonus, 0);
                    
                    const totalAmount = commissionTotal + bonusTotal;
                    const status = monthCommissions.every(c => c.status === 'paid') ? 'paid' : 'pending';
                    
                    return { month, totalAmount, status, commissions: monthCommissions, bonuses: monthBonuses };
                });
                
                processedPayouts.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
                setAllPayouts(processedPayouts);

            } catch (error) {
                console.error("Error processing payouts: ", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessData();
    }, [user, firestore, proposals, clients, clientMap, proposalsLoading, clientsLoading]);

    const { filteredPayouts, availableYears } = useMemo(() => {
        const yearSet = new Set<string>();

        allPayouts.forEach(payout => {
            const date = new Date(payout.month);
            yearSet.add(date.getFullYear().toString());
        });
        
        const filtered = allPayouts.filter(payout => {
            const date = new Date(payout.month);
            return selectedYear === 'all' || date.getFullYear().toString() === selectedYear;
        });

        return {
            filteredPayouts: filtered,
            availableYears: Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a)),
        }

    }, [allPayouts, selectedYear]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                 <DialogHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <DialogTitle>My Payout History</DialogTitle>
                            <DialogDescription>
                                A monthly summary of your commissions and their status.
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2 pt-1.5">
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </DialogHeader>
                <Card>
                    <CardContent className="pt-6">
                        <ScrollArea className="h-[60vh] pr-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Month</TableHead>
                                        <TableHead>Total Payout</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center">
                                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredPayouts.length > 0 ? (
                                        filteredPayouts.map((payout) => (
                                            <TableRow key={payout.month}>
                                                <TableCell className="font-semibold">{payout.month}</TableCell>
                                                <TableCell>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <button className="font-semibold text-primary hover:underline">
                                                                {currencyFormatter.format(payout.totalAmount)}
                                                            </button>
                                                        </DialogTrigger>
                                                        <PayoutMonthDetailsDialog month={payout.month} commissions={payout.commissions} bonuses={payout.bonuses} />
                                                    </Dialog>
                                                </TableCell>
                                                <TableCell>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Badge
                                                                variant={payout.status === 'paid' ? 'success' : 'warning'}
                                                                className="capitalize cursor-pointer"
                                                            >
                                                                {payout.status}
                                                            </Badge>
                                                        </DialogTrigger>
                                                        <PaymentTimelineDialog month={payout.month} status={payout.status} totalAmount={payout.totalAmount} />
                                                    </Dialog>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center">
                                                No payout records found for the selected period.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    );
}

