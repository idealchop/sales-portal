
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
    const firestore = useFirestore();

    const [allPayouts, setAllPayouts] = useState<MonthlyPayout[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

    useEffect(() => {
        const fetchAndProcessData = async () => {
             // MOCK DATA INJECTION
            const mockCommissions: PayoutCommission[] = [
                { id: 'c1', proposalId: 'P001', userId: 'user1', amount: 1200, status: 'paid', createdAt: '2024-07-15T10:00:00Z', type: 'commission', description: 'SME Plan Commission', clientName: 'Innovate Corp', referenceId: '072401' },
                { id: 'c2', proposalId: 'P002', userId: 'user1', amount: 2400, status: 'paid', createdAt: '2024-07-20T10:00:00Z', type: 'commission', description: 'Commercial Plan Commission', clientName: 'Tech Solutions Inc.', referenceId: '072402' },
                { id: 'b1', proposalId: '', userId: 'user1', amount: 2000, status: 'paid', createdAt: '2024-07-30T10:00:00Z', type: 'bonus', description: 'Corporate Closer I Bonus', referenceId: '072403' },
                { id: 'c3', proposalId: 'P003', userId: 'user1', amount: 800, status: 'paid', createdAt: '2024-06-10T10:00:00Z', type: 'commission', description: 'Family Plan Commission', clientName: 'John Doe Household', referenceId: '062401' },
                { id: 'c4', proposalId: 'P004', userId: 'user1', amount: 3000, status: 'paid', createdAt: '2024-06-25T10:00:00Z', type: 'commission', description: 'Enterprise Plan Commission', clientName: 'Global Exports', referenceId: '062402' },
                { id: 'c5', proposalId: 'P005', userId: 'user1', amount: 1500, status: 'pending', createdAt: '2024-08-05T10:00:00Z', type: 'commission', description: 'SME Plan Commission', clientName: 'Local Cafe', referenceId: '082401' },
            ];

            const commissionsByMonth = mockCommissions.reduce((acc, commission) => {
                const monthKey = format(startOfMonth(new Date(commission.createdAt)), 'MMMM yyyy');
                if (!acc[monthKey]) {
                    acc[monthKey] = [];
                }
                acc[monthKey].push(commission);
                return acc;
            }, {} as Record<string, PayoutCommission[]>);

            const processedPayouts: MonthlyPayout[] = Object.keys(commissionsByMonth).map(month => {
                const monthCommissions = commissionsByMonth[month] || [];
                const totalAmount = monthCommissions.reduce((sum, c) => sum + c.amount, 0);
                const status = monthCommissions.every(c => c.status === 'paid') ? 'paid' : 'pending';
                
                return { 
                    month, 
                    totalAmount, 
                    status, 
                    commissions: monthCommissions,
                    transactionId: `SR${String(Math.floor(Math.random() * 90000) + 10000)}`
                };
            });

            processedPayouts.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
            setAllPayouts(processedPayouts);
            setIsLoading(false);
        };
        fetchAndProcessData();
    }, [user, firestore]);

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

    