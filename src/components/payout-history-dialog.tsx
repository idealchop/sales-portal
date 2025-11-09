
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
import { format, startOfMonth, isWithinInterval, addMonths, addYears, parseISO } from 'date-fns';
import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from './ui/badge';
import { useUser } from '@/firebase';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useClients } from '@/hooks/use-clients';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CheckCircle, Clock, Loader2, Award, Star, Trophy } from 'lucide-react';
import type { Commission, Proposal, Client } from '@/lib/definitions';
import { useCommissions } from "@/hooks/use-commissions";
import type { FinalPlanDetails } from '@/components/contract-details';

type PayoutCommission = Commission & { clientName?: string };

type MonthlyPayout = {
    month: string;
    totalAmount: number;
    status: 'paid' | 'pending';
    commissions: PayoutCommission[];
    transactionId: string;
};

function PayoutMonthDetailsDialog({ month, commissions }: { month: string, commissions: PayoutCommission[] }) {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    
    return (
        <DialogContent className="sm:max-w-3xl">
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
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {commissions.map((commission) => (
                            <TableRow key={commission.id}>
                                <TableCell>
                                    <Badge
                                        variant={commission.type === 'bonus' ? 'special' : 'default'}
                                        className="capitalize"
                                    >
                                        {commission.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-semibold">{commission.description}</TableCell>
                                <TableCell>{commission.clientName || 'N/A'}</TableCell>
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
    const { commissions, clients, proposals, isLoading } = useCommissions(user?.uid);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

    const allPayouts = useMemo(() => {
        if (isLoading) return [];
        
        const clientMap = new Map(clients.map(client => [client.id, client]));

        // Calculate Current Month's Pending Payout
        const now = new Date();
        const currentMonthKey = format(startOfMonth(now), 'MMMM yyyy');
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = new Date();

        const commissionRates: { [key: string]: number } = {
            household: 0.12, sme: 0.12, commercial: 0.10, corporate: 0.10, enterprise: 0.08,
        };
        const recurringCommissionRate = 0.03;
        
        const currentMonthCommissions: PayoutCommission[] = [];

        // 1. One-time commissions from this month
        const acceptedThisMonth = proposals.filter(p => {
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
                    description: `One-time commission for ${proposal.title}`,
                    clientName: client.companyName,
                    proposalId: proposal.id,
                    status: 'pending',
                    type: 'commission',
                    userId: proposal.userId,
                    referenceId: proposal.id,
                 });
            }
        });

        // 2. Recurring commissions
        const oneYearAgo = addYears(now, -1);
        const activeClients = clients.filter(c => c.status === 'active' && c.clientType !== 'household');
        activeClients.forEach(client => {
             const acceptedProposalForClient = proposals.find(p => p.clientId === client.id && p.status === 'accepted');
             if (!acceptedProposalForClient || !acceptedProposalForClient.content) return;
             try {
                const proposalContent = JSON.parse(acceptedProposalForClient.content) as FinalPlanDetails;
                const dateSigned = proposalContent.date ? parseISO(proposalContent.date) : new Date(0);
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
                        description: `Recurring commission for ${proposalContent.summaryTitle}`,
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

        // Group historical commissions by month
        const commissionsByMonth = commissions.reduce((acc, commission) => {
            const monthKey = format(startOfMonth(new Date(commission.createdAt)), 'MMMM yyyy');
            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push(commission);
            return acc;
        }, {} as Record<string, PayoutCommission[]>);

        // Add current month's commissions if not already present from historical data
        if (!commissionsByMonth[currentMonthKey]) {
            commissionsByMonth[currentMonthKey] = [];
        }
        // This simple addition can lead to duplicates if some commissions for the current month are already in `commissions`.
        // A more robust solution would merge based on commission ID. For now, we combine and will filter later if needed.
        commissionsByMonth[currentMonthKey].push(...currentMonthCommissions);


        const processedPayouts: MonthlyPayout[] = Object.keys(commissionsByMonth).map(month => {
            const monthCommissions = commissionsByMonth[month] || [];
            // Remove duplicates for pending commissions calculated in real-time
            const uniqueCommissions = Array.from(new Map(monthCommissions.map(c => [c.id, c])).values());
            
            const totalAmount = uniqueCommissions.reduce((sum, c) => sum + c.amount, 0);
            const isCurrentMonth = month === currentMonthKey;
            
            // If it's the current month, it's always pending. Otherwise, check historical status.
            const status = isCurrentMonth ? 'pending' : (uniqueCommissions.every(c => c.status === 'paid') ? 'paid' : 'pending');
            
            return { 
                month, 
                totalAmount, 
                status, 
                commissions: uniqueCommissions,
                transactionId: `SR${String(Math.floor(10000 + Math.random() * 90000))}`
            };
        });

        processedPayouts.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
        return processedPayouts;
    }, [commissions, clients, proposals, isLoading]);


    const { filteredPayouts, availableYears } = useMemo(() => {
        const yearSet = new Set<string>();
        allPayouts.forEach(payout => {
            const date = new Date(payout.month);
            yearSet.add(date.getFullYear().toString());
        });
        
        const filtered = allPayouts.filter(payout => {
            if (payout.totalAmount === 0) return false;
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
                                        <TableHead>Payout Reference ID</TableHead>
                                        <TableHead>Total Payout</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredPayouts.length > 0 ? (
                                        filteredPayouts.map((payout) => (
                                            <TableRow key={payout.month}>
                                                <TableCell className="font-semibold">{payout.month}</TableCell>
                                                <TableCell className="font-mono text-xs">{payout.transactionId}</TableCell>
                                                <TableCell>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <button className="font-semibold text-primary hover:underline">
                                                                {currencyFormatter.format(payout.totalAmount)}
                                                            </button>
                                                        </DialogTrigger>
                                                        <PayoutMonthDetailsDialog month={payout.month} commissions={payout.commissions} />
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
                                            <TableCell colSpan={4} className="h-24 text-center">
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
