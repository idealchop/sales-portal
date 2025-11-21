
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
import { format } from 'date-fns';
import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from './ui/badge';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TFooter } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CheckCircle, Clock, Loader2 } from 'lucide-react';
import type { Commission, UserProfile } from '@/lib/definitions';
import { useCommissions } from "@/hooks/use-commissions";
import { Button } from "./ui/button";
import { WithId } from "@/firebase";

type PayoutCommission = Commission & { clientName?: string };

type TimelineStatus = 'calculated' | 'reviewed' | 'processing' | 'paid';

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
                            <TableHead>Client</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {commissions.map((commission, index) => (
                            <TableRow key={`${commission.id}-${index}`}>
                                <TableCell>
                                    <Badge
                                        variant={commission.type === 'bonus' ? 'special' : (commission.description === 'Manager Override' ? 'info' : 'default')}
                                        className="capitalize"
                                    >
                                        {commission.type === 'bonus' ? 'Bonus' : (commission.description === 'Manager Override' ? 'Override' : 'Commission')}
                                    </Badge>
                                </TableCell>
                                <TableCell>{commission.clientName || 'N/A'}</TableCell>
                                <TableCell className="text-right font-semibold">{currencyFormatter.format(commission.amount)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TFooter>
                        <TableRow>
                            <TableCell colSpan={2} className="text-right font-bold text-base">Total Amount</TableCell>
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
    timelineStatus: initialTimelineStatus,
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
    const [currentTimelineStatus, setCurrentTimelineStatus] = useState(initialTimelineStatus);
    
    const timelineSteps: { name: TimelineStatus, description: string }[] = [
        { name: 'calculated', description: 'Commissions and bonuses tallied.' },
        { name: 'reviewed', description: 'Payouts verified by finance.' },
        { name: 'processing', description: 'Sent to payment provider.' },
        { name: 'paid', description: 'Funds deposited to your account.' },
    ];
    
    const currentStatusIndex = timelineSteps.findIndex(step => step.name === currentTimelineStatus);

    const handleStepClick = (stepIndex: number) => {
        if (!isAdmin || !onProcessPayout) return;

        const newStatus = timelineSteps[stepIndex].name;
        setCurrentTimelineStatus(newStatus);
        
        if (newStatus === 'paid') {
            onProcessPayout();
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Payout Timeline for {month}</DialogTitle>
                <DialogDescription>
                    Status for your payout of <span className="font-bold text-primary">{currencyFormatter.format(totalAmount)}</span>.
                    {isAdmin && status === 'pending' && <span className="block text-xs mt-1">Click a step to update the status.</span>}
                </DialogDescription>
            </DialogHeader>
            <div className="py-6">
                <ul className="space-y-4">
                    {timelineSteps.map((step, index) => {
                        const isComplete = index <= currentStatusIndex;
                        const isClickable = isAdmin && status === 'pending';
                        
                        return (
                            <li key={step.name} className="flex items-start gap-4">
                                <div className="flex flex-col items-center">
                                    <button 
                                        onClick={() => handleStepClick(index)}
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

export function PayoutHistoryDialog({ children, user: propUser, isAdmin = false, onProcessPayout, processingPayouts = {} }: { children: React.ReactNode, user?: WithId<UserProfile>, isAdmin?: boolean, onProcessPayout?: (payoutId: string, commissions: WithId<Commission>[]) => void, processingPayouts?: Record<string, boolean> }) {
    const { user: authUser } = useUser();
    const { allPayouts: hookPayouts, isLoading: hookIsLoading, availableYears: hookYears } = useCommissions(propUser?.id || authUser?.uid);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    
    const user = propUser || authUser;

     const { filteredPayouts, availableYears } = useMemo(() => {
        const payouts = hookPayouts;
        const yearSet = new Set<string>();
        payouts.forEach(payout => {
            const date = new Date(payout.month);
            yearSet.add(date.getFullYear().toString());
        });
        
        const years = hookYears;
        
        const filtered = payouts.filter(payout => {
            if (payout.totalAmount === 0) return false;
            const date = new Date(payout.month);
            return selectedYear === 'all' || date.getFullYear().toString() === selectedYear;
        });

        return {
            filteredPayouts: filtered,
            availableYears: years,
        }

    }, [hookPayouts, selectedYear, hookYears]);


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
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {hookIsLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredPayouts.length > 0 ? (
                                        filteredPayouts.map((payout) => {
                                            const isProcessing = processingPayouts[`${user?.id}-${payout.month}`];
                                            return (
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
                                                                {isProcessing ? <Loader2 className="mr-2 h-3 w-3 animate-spin"/> : null}
                                                                {isProcessing ? 'Processing' : payout.status}
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
                                            </TableRow>
                                        )})
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
