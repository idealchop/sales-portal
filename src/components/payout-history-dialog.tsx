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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { format, startOfMonth, isWithinInterval, addYears, parseISO } from 'date-fns';
import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from './ui/badge';
import { useUser, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TFooter } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CheckCircle, Clock, Loader2, Award, Star, Trophy, CreditCard } from 'lucide-react';
import type { Commission, Proposal, Client, UserProfile } from '@/lib/definitions';
import { useCommissions } from "@/hooks/use-commissions";
import type { FinalPlanDetails } from '@/components/contract-details';
import { Button } from "./ui/button";
import { WithId } from "@/firebase";

type PayoutCommission = Commission & { clientName?: string };

type TimelineStatus = 'calculated' | 'reviewed' | 'processing' | 'paid';

type MonthlyPayout = {
    month: string;
    totalAmount: number;
    status: 'paid' | 'pending';
    timelineStatus: TimelineStatus;
    commissions: WithId<PayoutCommission>[];
    transactionId: string;
};

function PayoutMonthDetailsDialog({ month, commissions }: { month: string, commissions: PayoutCommission[] }) {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const totalAmount = commissions.reduce((sum, commission) => sum + commission.amount, 0);
    
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
                        {commissions.map((commission, index) => (
                            <TableRow key={`${commission.id}-${index}`}>
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
                    <TFooter>
                        <TableRow>
                            <TableCell colSpan={3} className="text-right font-bold text-base">Total Amount</TableCell>
                            <TableCell className="text-right font-bold text-base">{currencyFormatter.format(totalAmount)}</TableCell>
                        </TableRow>
                    </TFooter>
                </Table>
            </ScrollArea>
        </DialogContent>
    );
}

function PaymentTimelineDialog({ 
    month, 
    status, 
    totalAmount,
    timelineStatus,
    isAdmin,
    onProcessPayout,
}: { 
    month: string, 
    status: 'paid' | 'pending', 
    totalAmount: number,
    timelineStatus: TimelineStatus,
    isAdmin: boolean,
    onProcessPayout?: () => void,
 }) {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    
    const timelineSteps: { name: TimelineStatus, description: string }[] = [
        { name: 'calculated', description: 'Commissions and bonuses tallied.' },
        { name: 'reviewed', description: 'Payouts verified by finance.' },
        { name: 'processing', description: 'Sent to payment provider.' },
        { name: 'paid', description: 'Funds deposited to your account.' },
    ];
    
    const currentStatusIndex = timelineSteps.findIndex(step => step.name === timelineStatus);

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Payout Timeline for {month}</DialogTitle>
                <DialogDescription>
                    Status for your payout of <span className="font-bold text-primary">{currencyFormatter.format(totalAmount)}</span>.
                    {isAdmin && <span className="block text-xs mt-1">Click a step to update the status.</span>}
                </DialogDescription>
            </DialogHeader>
            <div className="py-6">
                <ul className="space-y-4">
                    {timelineSteps.map((step, index) => {
                        const isComplete = index <= currentStatusIndex;
                        const isClickable = isAdmin && onProcessPayout;
                        
                        return (
                            <li key={step.name} className="flex items-start gap-4">
                                <div className="flex flex-col items-center">
                                    <button 
                                        onClick={isClickable ? () => onProcessPayout() : undefined}
                                        disabled={!isClickable}
                                        className={cn(
                                            "flex h-10 w-10 items-center justify-center rounded-full ring-4 ring-background transition-colors",
                                            isComplete ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-700",
                                            isClickable && "hover:bg-green-200 dark:hover:bg-green-800"
                                        )}
                                    >
                                        {isComplete ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" /> : <Clock className="h-5 w-5 text-gray-500" />}
                                    </button>
                                    {index < timelineSteps.length - 1 && (
                                        <div className={cn(
                                            "h-12 w-px",
                                            isComplete ? "bg-green-300" : "bg-border"
                                        )}></div>
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-semibold capitalize">{step.name}</h4>
                                    <p className="text-sm text-muted-foreground">{step.description}</p>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </DialogContent>
    )
}

export function PayoutHistoryDialog({ children, user: propUser, commissions: propCommissions, clients: propClients, proposals: propProposals, isAdmin = false, onProcessPayout, processingPayouts }: { children: React.ReactNode, user?: WithId<UserProfile>, commissions?: WithId<Commission>[], clients?: WithId<Client>[], proposals?: WithId<Proposal>[], isAdmin?: boolean, onProcessPayout?: (payoutId: string, commissions: WithId<Commission>[]) => void, processingPayouts?: Record<string, boolean> }) {
    const { user: authUser } = useUser();
    const { commissions: hookCommissions, clients: hookClients, proposals: hookProposals, isLoading: hookIsLoading } = useCommissions(propUser?.id || authUser?.uid);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    
    const commissions = propCommissions || hookCommissions;
    const clients = propClients || hookClients;
    const proposals = propProposals || hookProposals;
    const isLoading = propCommissions ? false : hookIsLoading;
    const user = propUser || authUser;

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
            const isCurrentMonth = month === currentMonthKey;
            
            const allPaid = uniqueCommissions.every(c => c.status === 'paid');
            const status = isCurrentMonth ? 'pending' : (allPaid ? 'paid' : 'pending');
            const timelineStatus = allPaid ? 'paid' : 'calculated';
            
            return { 
                month, 
                totalAmount, 
                status, 
                timelineStatus,
                commissions: uniqueCommissions,
                transactionId: `SR-PO-${new Date(month).getFullYear()}${String(new Date(month).getMonth() + 1).padStart(2, '0')}-${user?.id.slice(0, 4).toUpperCase()}`
            };
        });

        processedPayouts.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
        return processedPayouts;
    }, [commissions, clients, proposals, isLoading, user, authUser]);


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
            <DialogContent className="sm:max-w-4xl">
                 <DialogHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <DialogTitle>{isAdmin ? `Payouts for ${user?.displayName}`: 'My Payout History'}</DialogTitle>
                            <DialogDescription>
                                A monthly summary of commissions and their status.
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
                                        {isAdmin && <TableHead className="text-center">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={isAdmin ? 5: 4} className="h-24 text-center">
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
                                                        <PaymentTimelineDialog 
                                                            month={payout.month} 
                                                            status={payout.status} 
                                                            totalAmount={payout.totalAmount}
                                                            timelineStatus={payout.timelineStatus}
                                                            isAdmin={isAdmin}
                                                            onProcessPayout={isAdmin && payout.status === 'pending' && onProcessPayout ? () => onProcessPayout(`${user?.id}-${payout.month}`, payout.commissions) : undefined}
                                                        />
                                                    </Dialog>
                                                </TableCell>
                                                 {isAdmin && (
                                                    <TableCell className="text-center">
                                                        {payout.status === 'pending' && onProcessPayout && processingPayouts ? (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button size="sm" disabled={processingPayouts[`${user?.id}-${payout.month}`]}>
                                                                        {processingPayouts[`${user?.id}-${payout.month}`] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                                                                        Process Payout
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Confirm Payout</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Are you sure you want to mark the {payout.month} payout of <span className="font-bold">{currencyFormatter.format(payout.totalAmount)}</span> for <span className="font-bold">{user?.displayName}</span> as paid? This action cannot be undone.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => onProcessPayout(`${user?.id}-${payout.month}`, payout.commissions)}>
                                                                            Confirm & Mark as Paid
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        ) : (
                                                            <span className="text-sm text-muted-foreground italic">{payout.status === 'paid' ? 'Paid' : '-'}</span>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center">
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
