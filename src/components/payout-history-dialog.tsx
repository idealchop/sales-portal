
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
import { useSalesUsers } from "@/hooks/use-sales-users";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

type PayoutCommission = Commission & { clientName?: string };

type TimelineStatus = 'calculated' | 'reviewed' | 'processing' | 'paid';

function PayoutMonthDetailsDialog({ month, commissions, allCommissions }: { month: string, commissions: PayoutCommission[], allCommissions: PayoutCommission[] }) {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

    const directSales = useMemo(() => allCommissions.filter(c => c.type === 'commission' && !c.description?.includes('Override') && !c.description?.includes('QR') && !c.description?.includes('Recurring')), [allCommissions]);
    const qrCampaigns = useMemo(() => allCommissions.filter(c => c.description?.includes('QR') && !c.description?.includes('Recurring')), [allCommissions]);
    const overrides = useMemo(() => allCommissions.filter(c => c.description?.includes('Override')), [allCommissions]);
    const recurring = useMemo(() => allCommissions.filter(c => c.description?.includes('Recurring')), [allCommissions]);

    const totalAmount = commissions.reduce((sum, commission) => sum + commission.amount, 0);
    
    const CommissionTable = ({ title, commissions, showClient = true }: { title: string, commissions: PayoutCommission[], showClient?: boolean }) => {
      if (commissions.length === 0) return null;
      return (
        <Card>
            <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {showClient && <TableHead>Client</TableHead>}
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {commissions.map((c, i) => (
                            <TableRow key={i}>
                                {showClient && <TableCell>{c.clientName}</TableCell>}
                                <TableCell>{c.description}</TableCell>
                                <TableCell className="text-right font-semibold">{currencyFormatter.format(c.amount)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      );
    }

    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Payout Details for {month}</DialogTitle>
                <DialogDescription>
                    Detailed breakdown of commissions and bonuses for this period.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[50vh] pr-4">
                <div className="space-y-4">
                    <CommissionTable title="One-Time Commissions" commissions={directSales} />
                    <CommissionTable title="QR Campaign Commissions" commissions={qrCampaigns} />
                    <CommissionTable title="Recurring Commissions" commissions={recurring} />
                    <CommissionTable title="Team Overrides" commissions={overrides} showClient={false} />
                </div>
            </ScrollArea>
            <DialogFooter className="border-t pt-4">
                <div className="w-full flex justify-between items-center text-lg font-bold">
                    <span>Total Payout</span>
                    <span>{currencyFormatter.format(totalAmount)}</span>
                </div>
            </DialogFooter>
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

function PayoutHistoryView({ userId, onProcessPayout, processingPayouts }: { userId?: string, onProcessPayout?: (payoutId: string, commissions: WithId<Commission>[]) => void, processingPayouts?: Record<string, boolean> }) {
    const { allPayouts, isLoading, availableYears } = useCommissions(userId);
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const [yearFilter, setYearFilter] = useState<string>('all');

    const filteredPayouts = useMemo(() => {
        if (!allPayouts) return [];
        return allPayouts.filter(payout => {
            if (payout.totalAmount === 0) return false;
            const date = new Date(payout.month);
            return yearFilter === 'all' || date.getFullYear().toString() === yearFilter;
        });
    }, [allPayouts, yearFilter]);

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by year" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <ScrollArea className="h-[50vh] pr-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead>Total Payout</TableHead>
                                    <TableHead>Status</TableHead>
                                    {onProcessPayout && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={onProcessPayout ? 4 : 3} className="h-24 text-center">
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
                                                    <PayoutMonthDetailsDialog month={payout.month} commissions={payout.commissions} allCommissions={payout.commissions} />
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
                                                        isAdmin={!!onProcessPayout}
                                                        onProcessPayout={onProcessPayout ? () => onProcessPayout(`${payout.transactionId}-${payout.month}`, payout.commissions) : undefined}
                                                    />
                                                </Dialog>
                                            </TableCell>
                                            {onProcessPayout && (
                                                <TableCell className="text-right">
                                                    {payout.status === 'pending' && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button size="sm" disabled={processingPayouts && processingPayouts[`${payout.transactionId}-${payout.month}`]}>
                                                                    {processingPayouts && processingPayouts[`${payout.transactionId}-${payout.month}`] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                                    Process Payout
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Confirm Payout?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This will mark the {payout.month} payout of {currencyFormatter.format(payout.totalAmount)} as paid and notify the sales representative. This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => onProcessPayout && onProcessPayout(`${payout.transactionId}-${payout.month}`, payout.commissions)}>
                                                                        Yes, Confirm Payout
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={onProcessPayout ? 4 : 3} className="h-24 text-center">
                                            No payout records found for the selected period.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

export function PayoutHistoryDialog({ children, user: propUser, isAdmin = false, onProcessPayout, processingPayouts = {} }: { children: React.ReactNode, user?: WithId<UserProfile>, isAdmin?: boolean, onProcessPayout?: (payoutId: string, commissions: WithId<Commission>[]) => void, processingPayouts?: Record<string, boolean> }) {
    const { user: authUser, isManager } = useUser();
    const { salesUsers, isLoading: isSalesUsersLoading } = useSalesUsers();
    
    const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
    
    const teamMembers = useMemo(() => {
        if (!isManager || !authUser || isSalesUsersLoading) return [];
        const managerTeamName = `${authUser.location} (${authUser.displayName})`;
        return salesUsers.filter(u => u.team === managerTeamName);
    }, [isManager, authUser, salesUsers, isSalesUsersLoading]);
    
    useEffect(() => {
        if (propUser) {
            setSelectedUserId(propUser.id);
        } 
        else if (authUser) {
            setSelectedUserId(authUser.id);
        }
    }, [propUser, authUser]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
                 <DialogHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                            <DialogTitle>{isAdmin && propUser ? `Payouts for ${propUser?.displayName}`: 'Payout History'}</DialogTitle>
                            <DialogDescription>
                                A monthly summary of commissions and their status.
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                             {isManager && teamMembers.length > 0 && !isAdmin && (
                                <div className="w-full sm:w-[250px]">
                                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select team member..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={authUser?.id}>My Payouts</SelectItem>
                                            {teamMembers.map(member => (
                                                <SelectItem key={member.id} value={member.id}>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage src={member.photoURL ?? undefined} />
                                                            <AvatarFallback className="text-xs">{member.displayName?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <span>{member.displayName}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogHeader>
                {selectedUserId && <PayoutHistoryView 
                    userId={selectedUserId} 
                    onProcessPayout={isAdmin ? onProcessPayout : undefined} 
                    processingPayouts={isAdmin ? processingPayouts : undefined}
                />}
            </DialogContent>
        </Dialog>
    );
}

    