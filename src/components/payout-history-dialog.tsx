

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

function PayoutHistoryView({ userId, userDisplayName, onProcessPayout, processingPayouts }: { userId?: string, userDisplayName: string, onProcessPayout?: (payoutId: string, commissions: WithId<Commission>[]) => void, processingPayouts?: Record<string, boolean> }) {
    const { allPayouts, isLoading, availableYears } = useCommissions(userId);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

    const filteredPayouts = useMemo(() => {
        if (!allPayouts) return [];
        return allPayouts.filter(payout => {
            if (payout.totalAmount === 0) return false;
            const date = new Date(payout.month);
            return selectedYear === 'all' || date.getFullYear().toString() === selectedYear;
        });
    }, [allPayouts, selectedYear]);

    return (
        <div>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="font-semibold">Payouts for {userDisplayName}</h3>
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
                                                                    <AlertDialogAction onClick={() => onProcessPayout(`${payout.transactionId}-${payout.month}`, payout.commissions)}>
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
        // If a specific user is passed (e.g., from admin page), use that.
        if (propUser) {
            setSelectedUserId(propUser.id);
        } 
        // Otherwise (e.g., from header dropdown), default to the logged-in user.
        else {
            setSelectedUserId(authUser?.id);
        }
    }, [propUser, authUser]);

    const selectedUserDisplayName = useMemo(() => {
        if (!selectedUserId) return 'Loading...';
        if (selectedUserId === authUser?.id) return 'My Payouts';
        const member = [...salesUsers, propUser, authUser].find(u => u?.id === selectedUserId);
        return member?.displayName || 'Select...';
    }, [selectedUserId, salesUsers, propUser, authUser]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
                 <DialogHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <DialogTitle>{isAdmin && propUser ? `Payouts for ${propUser?.displayName}`: 'Payout History'}</DialogTitle>
                            <DialogDescription>
                                A monthly summary of commissions and their status.
                            </DialogDescription>
                        </div>
                        {isManager && teamMembers.length > 0 && (
                            <div className="w-[250px]">
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
                </DialogHeader>
                {selectedUserId && <PayoutHistoryView userId={selectedUserId} userDisplayName={selectedUserDisplayName} onProcessPayout={isAdmin ? onProcessPayout : undefined} processingPayouts={isAdmin ? processingPayouts : undefined} />}
            </DialogContent>
        </Dialog>
    );
}
