
'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowUpRight,
  CircleDollarSign,
  UsersRound,
  TrendingUp,
  Repeat,
  Award,
  Target,
  HeartHandshake,
  Star,
  Trophy,
  CalendarCheck,
  Users,
  BookCopy,
  Home,
  CreditCard,
  PlusCircle,
  FileText,
  Percent,
  CheckCircle,
  Receipt,
  User,
  Power,
  CalendarDays,
  Activity,
  Building,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { RevenueChart } from '@/components/revenue-chart';
import { ClientPopover } from '@/components/client-popover';
import type { Client, Proposal, PayoutCommission } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { ActivityChart } from '@/components/activity-chart';
import { useProposals } from '@/hooks/use-proposals';
import { useClients } from '@/hooks/use-clients';
import { useCommissions } from '@/hooks/use-commissions';
import { useMemo } from 'react';
import { subMonths, startOfMonth, endOfMonth, format, getQuarter, startOfQuarter, endOfQuarter, isWithinInterval, addMonths, addYears, parseISO, differenceInMonths, isValid } from 'date-fns';
import { useUser } from '@/firebase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PayoutHistoryDialog } from '@/components/payout-history-dialog';
import { useSalesUsers } from '@/hooks/use-sales-users';
import type { FinalPlanDetails } from '@/components/contract-details';

const statusStyles: { [key: string]: string } = {
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const BonusCard = ({ icon, title, value, progress, goal, description, children }: { icon: React.ReactNode, title: string, value: string | number, progress: number, goal: string, description: string, children?: React.ReactNode }) => (
    <Dialog>
        <DialogTrigger asChild>
            <Card className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                        {icon}
                        <CardTitle className="text-base font-semibold">{title}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="text-3xl font-bold">{value}</div>
                    <Progress value={progress} />
                    <p className="text-xs text-muted-foreground">{goal}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </CardContent>
            </Card>
        </DialogTrigger>
        {children}
    </Dialog>
)

const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 mt-2" />
    </div>

    {/* Commission Stats */}
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-3 w-32 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
    
    <div className="w-full flex justify-center items-center py-10">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
    </div>

    {/* Charts and Materials */}
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <Skeleton className="aspect-video w-full" />
        <CardContent className="pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4 mt-1" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-9 w-full" />
        </CardFooter>
      </Card>
    </div>

    {/* Proposal Snapshot */}
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
        <Skeleton className="h-9 w-32" />
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-6"><Skeleton className="h-32 w-32 mx-auto rounded-full" /></CardContent></Card>
        <Card className="lg:col-span-2"><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
      </CardContent>
    </Card>

    {/* Recent Proposals Table */}
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-56 mt-1" />
        </div>
        <Skeleton className="h-9 w-36" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-2">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
)

export default function DashboardPage() {
  const { user, isManager } = useUser();
  const { proposals, isLoading: proposalsLoading } = useProposals(user?.uid);
  const { clients, isLoading: clientsLoading } = useClients(user?.uid);
  const { salesUsers, isLoading: usersLoading } = useSalesUsers();
  const { allPayouts, commissions: rawCommissions, isLoading: commissionsLoading } = useCommissions(user?.uid);

  const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

  const clientMap = useMemo(() => new Map(clients.map(client => [client.id, client])), [clients]);
  const userMap = useMemo(() => new Map(salesUsers.map(u => [u.id, u])), [salesUsers]);
  const proposalMap = useMemo(() => new Map(proposals.map(p => [p.id, p])), [proposals]);

  const dashboardData = useMemo(() => {
    const now = new Date();
    const currentMonthKey = format(startOfMonth(now), 'MMMM yyyy');

    const currentMonthPayout = allPayouts.find(p => p.month === currentMonthKey);
    
    const oneTimeCommissionsThisMonth = currentMonthPayout?.commissions.filter(c => c.type === 'commission' && c.description !== 'Recurring commission') || [];
    const recurringCommissionsThisMonth = currentMonthPayout?.commissions.filter(c => c.description === 'Recurring commission') || [];
    
    const monthlyCommission = oneTimeCommissionsThisMonth.reduce((sum, p) => sum + p.amount, 0);
    const recurringCommission = recurringCommissionsThisMonth.reduce((sum, p) => sum + p.amount, 0);
    
    const lastMonthKey = format(startOfMonth(subMonths(now, 1)), 'MMMM yyyy');
    const lastMonthPayout = allPayouts.find(p => p.month === lastMonthKey);
    const lastMonthOneTimeCommission = lastMonthPayout?.commissions.filter(c => c.type === 'commission' && c.description !== 'Recurring commission').reduce((sum, p) => sum + p.amount, 0) || 0;
    
    const commissionChange = lastMonthOneTimeCommission > 0 
        ? ((monthlyCommission - lastMonthOneTimeCommission) / lastMonthOneTimeCommission) * 100 
        : (monthlyCommission > 0 ? 100 : 0);
    
    const acceptedProposals = proposals.filter(p => p.status === 'accepted');

    const corporateClientsThisMonth = oneTimeCommissionsThisMonth.filter(c => {
        const client = clientMap.get(proposals.find(p => p.id === c.proposalId)?.clientId || '');
        return client && ['sme', 'commercial', 'corporate', 'enterprise'].includes(client.clientType || '');
    }).length;

    const individualClientsThisMonth = oneTimeCommissionsThisMonth.filter(c => {
        const client = clientMap.get(proposals.find(p => p.id === c.proposalId)?.clientId || '');
        return client && client.clientType === 'household';
    }).length;
    
    const corporateClientsTarget = 3;
    const individualClientsTarget = 10;
    
    const quarterStart = startOfQuarter(now);
    const quarterEnd = endOfQuarter(now);
    const quarterlySalesVolume = acceptedProposals.filter(p => {
        const proposalDate = new Date(p.createdAt);
        return isWithinInterval(proposalDate, { start: quarterStart, end: quarterEnd });
    }).reduce((sum, p) => sum + p.amount, 0);

    const quarterlyVolumeTarget = 600000;

    const commissionHistory = allPayouts.slice(0, 6).map(payout => ({
        month: format(new Date(payout.month), 'MMM'),
        revenue: payout.totalAmount,
    })).reverse();

    const proposalsSent = proposals.filter(p => p.status !== 'draft').length;
    const winRate = proposalsSent > 0 ? (acceptedProposals.length / proposalsSent) * 100 : 0;
    
    const totalSalesValue = acceptedProposals.reduce((sum, p) => sum + p.amount, 0);
    const avgDealSize = acceptedProposals.length > 0 ? totalSalesValue / acceptedProposals.length : 0;

    const recentProposals = proposals.slice(0, 5);

    const activityData = [
      { name: 'Sent', value: proposalsSent, fill: 'hsl(var(--chart-2))' },
      { name: 'Accepted', value: acceptedProposals.length, fill: 'hsl(var(--chart-1))' },
    ];
    
    const teamRevenue = allPayouts.reduce((sum, payout) => sum + payout.totalAmount, 0);

    const prepaidContractsDetails = acceptedProposals
      .map(proposal => {
        try {
          if (!proposal.content) return null;
          const content = JSON.parse(proposal.content);
          if (content.billingCycleLabel && content.billingCycleLabel !== 'Monthly') {
            const client = clientMap.get(proposal.clientId);
            return {
              clientName: client?.companyName || 'Unknown Client',
              term: content.billingCycleLabel,
            };
          }
          return null;
        } catch {
          return null;
        }
      })
      .filter((item): item is { clientName: string; term: string } => item !== null);

    const prepaidContracts = prepaidContractsDetails.length;
    const prepaidContractsTarget = 5;

    return {
        monthlyCommission,
        commissionChange,
        recurringCommission,
        oneTimeCommissionsThisMonth,
        recurringCommissionsThisMonth,
        corporateClientsThisMonth,
        corporateClientsTarget,
        individualClientsThisMonth,
        individualClientsTarget,
        quarterlySalesVolume,
        quarterlyVolumeTarget,
        commissionHistory,
        proposalsSent,
        winRate,
        avgDealSize,
        recentProposals,
        activityData,
        acceptedProposals,
        teamRevenue,
        prepaidContracts,
        prepaidContractsTarget,
        prepaidContractsDetails,
    };
  }, [allPayouts, rawCommissions, proposals, clients, clientMap]);

  const commissionTiers = [
    { clientType: 'Family Plan', commission: '12%', recurring: 'None', managerOverride: '2%' },
    { clientType: 'SME', commission: '12%', recurring: '3%', managerOverride: '3%' },
    { clientType: 'Commercial', commission: '10%', recurring: '3%', managerOverride: '3%' },
    { clientType: 'Corporate', commission: '10%', recurring: '3%', managerOverride: '3%' },
    { clientType: 'Enterprise', commission: '8%', recurring: '3%', managerOverride: '2%' },
  ];
  
  const closerBonusTiers = [
    { target: 3, bonus: 2000, icon: <Star className="h-5 w-5 text-yellow-400" /> },
    { target: 5, bonus: 5000, icon: <Star className="h-5 w-5 text-yellow-400" /> },
    { target: 10, bonus: 12000, icon: <Trophy className="h-5 w-5 text-amber-500" /> },
  ]
   const individualCloserBonusTiers = [
    { target: 10, bonus: 2500, icon: <Star className="h-5 w-5 text-yellow-400" /> },
    { target: 20, bonus: 6000, icon: <Trophy className="h-5 w-5 text-amber-500" /> },
    { target: 30, bonus: 15000, icon: <Award className="h-5 w-5 text-violet-500" /> },
  ]
  const growthBonusTiers = [
    { target: 200000, bonus: '₱5,000', icon: <Star className="h-5 w-5 text-yellow-400" /> },
    { target: 400000, bonus: '₱10,000', icon: <Trophy className="h-5 w-5 text-amber-500" /> },
    { target: 600000, bonus: '₱20,000 + Elite Partner Badge', icon: <Award className="h-5 w-5 text-violet-500" /> },
  ];

  const prepaymentProgressTiers = [
    { target: 3, reward: '₱1,000' },
    { target: 9, reward: '₱4,000' },
    { target: 15, reward: '₱10,000 Milestone Bonus' },
  ];
  const payoutTimeline = [
      { term: 'Monthly', schedule: 'Within 7–15 days after payment' },
      { term: 'Quarterly', schedule: '⅓ each month after payment' },
      { term: 'Semi-Annual', schedule: 'Spread monthly for 6 months' },
      { term: 'Annual', schedule: 'Spread monthly for 12 months' },
  ];
  
  if (proposalsLoading || clientsLoading || usersLoading || commissionsLoading) {
      return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold">My Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.displayName || 'Sandra'}! Here's your earnings and goals snapshot.</p>
        </div>
        <Button asChild size="sm">
            <Link href="/dashboard/proposals/new">Create Proposal</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Dialog>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle>Monthly Commission History</CardTitle>
                <CardDescription>
                  A summary of your commission earnings over the last 6 months. Click to learn more.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueChart data={dashboardData.commissionHistory} />
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Commission &amp; Payouts Guide</DialogTitle>
                <DialogDescription>
                    This guide explains how your commissions are calculated and paid out.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-8 py-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Commission Structure</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Client Tier</TableHead>
                                    <TableHead className="text-center">One-Time</TableHead>
                                    <TableHead className="text-center">Recurring</TableHead>
                                    {isManager && <TableHead className="text-center">Manager Override</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {commissionTiers.map((tier) => (
                                    <TableRow key={tier.clientType}>
                                        <TableCell className="font-medium">{tier.clientType}</TableCell>
                                        <TableCell className="text-center font-bold text-primary">{tier.commission}</TableCell>
                                        <TableCell className="text-center font-bold text-primary">{tier.recurring}</TableCell>
                                        {isManager && <TableCell className="text-center font-bold text-blue-600">{tier.managerOverride}</TableCell>}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Recurring Commission Payout Schedule</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Contract Term</TableHead>
                                    <TableHead>Payout Schedule</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payoutTimeline.map((item) => (
                                    <TableRow key={item.term}>
                                        <TableCell className="font-semibold">{item.term}</TableCell>
                                        <TableCell>{item.schedule}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                   <div className="md:col-span-2">
                      <h3 className="text-lg font-semibold mb-2">6-Month Commission History</h3>
                      <RevenueChart data={dashboardData.commissionHistory} />
                  </div>
                   <p className="text-sm text-muted-foreground">
                      All earnings (commissions &amp; bonuses) are calculated at the end of each month and paid every first week of the month.
                  </p>
              </div>
            </ScrollArea>
             <DialogFooter>
                <PayoutHistoryDialog>
                  <Button variant="outline">
                    <Receipt className="mr-2 h-4 w-4" />
                    View Full Payout History
                  </Button>
                </PayoutHistoryDialog>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Sales Materials</CardTitle>
            <CardDescription>Your toolkit for success.</CardDescription>
          </CardHeader>
          <div className="relative aspect-video w-full">
            <Image
                src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Fwater_refill_Flow.png?alt=media&token=6b11f719-39e9-4ea4-b4a6-1bbe587bfa63"
                alt="Sales Materials Preview"
                fill
                className="object-cover"
              />
          </div>
          <CardContent className="pt-4">
             <p className="text-sm text-muted-foreground">
              Access presentations, brochures, and case studies. Use these powerful tools to engage clients and close deals faster.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild size="sm" className="gap-1 w-full">
              <Link href="/dashboard/materials">
                View All Materials
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Commission Stats */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-primary to-[#3ab7b1] text-primary-foreground">
            <Dialog>
                <DialogTrigger asChild>
                    <div className="cursor-pointer p-6">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
                            <CardTitle className="text-sm font-medium">One-Time Commission</CardTitle>
                            <CircleDollarSign className="h-4 w-4 text-primary-foreground/80" />
                        </CardHeader>
                        <CardContent className="p-0 pt-2">
                            <div className="text-3xl font-bold">{currencyFormatter.format(dashboardData.monthlyCommission)}</div>
                            <p className="text-xs text-primary-foreground/80">
                                {dashboardData.commissionChange >= 0 ? '+' : ''}
                                {dashboardData.commissionChange.toFixed(0)}% from last month
                            </p>
                            <p className="text-xs text-primary-foreground/80 mt-2 underline">Click to see breakdown</p>
                        </CardContent>
                    </div>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Monthly Commission Breakdown</DialogTitle>
                        <DialogDescription>
                            Showing one-time commissions for {format(new Date(), 'MMMM yyyy')}.
                        </DialogDescription>
                    </DialogHeader>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Commission</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dashboardData.oneTimeCommissionsThisMonth.length > 0 ? dashboardData.oneTimeCommissionsThisMonth.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.clientName || 'N/A'}</TableCell>
                                    <TableCell>{p.description}</TableCell>
                                    <TableCell className="text-right font-semibold">{currencyFormatter.format(p.amount)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">No one-time commissions this month.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </DialogContent>
            </Dialog>
        </Card>
        <Card className="bg-gradient-to-r from-primary to-[#3ab7b1] text-primary-foreground">
             <Dialog>
                <DialogTrigger asChild>
                    <div className="cursor-pointer p-6">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
                            <CardTitle className="text-sm font-medium">Recurring Commission</CardTitle>
                            <Repeat className="h-4 w-4 text-primary-foreground/80" />
                        </CardHeader>
                        <CardContent className="p-0 pt-2">
                            <div className="text-3xl font-bold">{currencyFormatter.format(dashboardData.recurringCommission)}</div>
                            <p className="text-xs text-primary-foreground/80">Your stable monthly base income.</p>
                             <p className="text-xs text-primary-foreground/80 mt-2 underline">Click to see breakdown</p>
                        </CardContent>
                    </div>
                </DialogTrigger>
                 <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Recurring Commission Breakdown</DialogTitle>
                        <DialogDescription>
                            Showing recurring commissions for {format(new Date(), 'MMMM yyyy')}.
                        </DialogDescription>
                    </DialogHeader>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Commission</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dashboardData.recurringCommissionsThisMonth.length > 0 ? dashboardData.recurringCommissionsThisMonth.map(p => {
                                const proposal = proposalMap.get(p.proposalId);
                                let progressText = '';
                                if (proposal && proposal.content) {
                                    try {
                                        const content = JSON.parse(proposal.content) as FinalPlanDetails;
                                        // Use dateSigned from the subscription object stored in the client document first
                                        const client = clientMap.get(proposal.clientId);
                                        const dateSignedStr = client?.subscription?.dateSigned || content.date;

                                        if (dateSignedStr) {
                                            const startDate = parseISO(dateSignedStr);
                                            if (isValid(startDate)) {
                                                const monthsDiff = differenceInMonths(new Date(), startDate) + 1;
                                                if (monthsDiff > 0 && monthsDiff <= 12) {
                                                    progressText = `(${monthsDiff}/12)`;
                                                }
                                            }
                                        }
                                    } catch (e) {
                                        console.error("Error parsing proposal content for recurring commission:", e);
                                    }
                                }
                                return (
                                    <TableRow key={p.id}>
                                        <TableCell>{p.clientName || 'N/A'}</TableCell>
                                        <TableCell>{p.description}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="font-semibold">{currencyFormatter.format(p.amount)}</span>
                                                {progressText && <Badge variant="outline" className="font-mono text-xs">{progressText}</Badge>}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">No recurring commissions this month.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <DialogFooter className="border-t pt-4">
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <h4 className="font-semibold text-foreground">Important Notes:</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Recurring commissions are paid monthly for the first 12 months of a new client contract.</li>
                                <li>If a client cancels their subscription, recurring commissions for that client will stop.</li>
                                <li>For contract renewals after 12 months, the standard one-time commission applies, but recurring commissions do not.</li>
                            </ul>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
        <Card className="bg-gradient-to-r from-primary to-[#3ab7b1] text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Corp. Clients Bonus</CardTitle>
            <Target className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData.corporateClientsThisMonth} / {dashboardData.corporateClientsTarget}</div>
            <div className="mt-2 space-y-1">
              <Progress value={(dashboardData.corporateClientsThisMonth / dashboardData.corporateClientsTarget) * 100} className="h-3 bg-primary-foreground/30" indicatorClassName="bg-primary-foreground" />
              <p className="text-xs text-primary-foreground/80">You're {Math.max(0, dashboardData.corporateClientsTarget - dashboardData.corporateClientsThisMonth)} client(s) away from your ₱2,000 bonus!</p>
            </div>
          </CardContent>
        </Card>
        <Dialog>
          <DialogTrigger asChild>
            <Card className="bg-gradient-to-r from-primary to-[#3ab7b1] text-primary-foreground cursor-pointer" >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quarterly Sales Volume</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary-foreground/80" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{currencyFormatter.format(dashboardData.quarterlySalesVolume)}</div>
                 <div className="mt-2 space-y-1">
                  <Progress value={(dashboardData.quarterlySalesVolume / dashboardData.quarterlyVolumeTarget) * 100} className="h-3 bg-primary-foreground/30" indicatorClassName="bg-primary-foreground" />
                  <p className="text-xs text-primary-foreground/80">Target: {currencyFormatter.format(dashboardData.quarterlyVolumeTarget)} for a ₱20k bonus</p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
                <DialogTitle>Quarterly Growth Bonus</DialogTitle>
                <DialogDescription>To reward expansion and total client base impact.</DialogDescription>
            </DialogHeader>
             <div className="space-y-4 py-4">
                <p>Your current progress: <span className="font-bold">{currencyFormatter.format(dashboardData.quarterlySalesVolume)}</span> in new recurring volume this quarter.</p>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Metric</TableHead>
                            <TableHead>Bonus</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {growthBonusTiers.map(tier => (
                            <TableRow key={tier.target} className={cn(dashboardData.quarterlySalesVolume >= tier.target && "bg-green-100 dark:bg-green-900/50")}>
                                <TableCell className="font-medium flex items-center gap-2">{tier.icon} Achieve {currencyFormatter.format(tier.target)}</TableCell>
                                <TableCell className="font-bold text-primary">{tier.bonus}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          </DialogContent>
        </Dialog>
      </div>

       <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <div>
              <CardTitle>Proposal Snapshot</CardTitle>
              <CardDescription>Your key performance indicators for this month.</CardDescription>
            </div>
            <Button asChild size="sm">
                <Link href="/dashboard/proposals/new">Create Proposal</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
             <Card>
              <CardHeader>
                <CardTitle className='text-base font-medium'>Success Rate</CardTitle>
              </CardHeader>
              <CardContent className='flex items-center justify-center'>
                 <div className="relative h-32 w-32">
                  <svg className="h-full w-full" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.91_55 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="3"
                      strokeDasharray={`${dashboardData.winRate}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{dashboardData.winRate.toFixed(0)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
             <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className='text-base font-medium'>Proposals</CardTitle>
                <CardDescription>Sent vs. Accepted</CardDescription>
              </CardHeader>
              <CardContent className="h-40">
                <ActivityChart data={dashboardData.activityData} />
              </CardContent>
            </Card>
             <Card>
              <CardHeader>
                <CardTitle className='text-base font-medium'>Avg. Deal Size</CardTitle>
              </CardHeader>
              <CardContent className='flex flex-col items-center justify-center text-center h-40'>
                <div className='flex items-center justify-center rounded-full bg-primary/10 h-20 w-20 mb-4'>
                    <CircleDollarSign className='h-10 w-10 text-primary'/>
                </div>
                <div className="text-3xl font-bold">{currencyFormatter.format(dashboardData.avgDealSize)}</div>
                <p className="text-xs text-muted-foreground">from {dashboardData.acceptedProposals.length} accepted proposals</p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Proposals</CardTitle>
            <CardDescription>Your latest proposals at a glance.</CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/proposals">View All Proposals</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="hidden sm:table-cell">Sales Rep</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden md:table-cell text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(proposalsLoading || clientsLoading || usersLoading) && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading proposals...
                  </TableCell>
                </TableRow>
              )}
              {!(proposalsLoading || clientsLoading || usersLoading) && dashboardData.recentProposals.map((proposal) => {
                const client = clientMap.get(proposal.clientId);
                const owner = userMap.get(proposal.userId);
                if (!client) return null;
                return (
                  <TableRow key={proposal.id}>
                    <TableCell>
                      <ClientPopover client={client}>
                        <div className="font-medium text-primary hover:underline cursor-pointer">{client.companyName}</div>
                      </ClientPopover>
                      <div className="text-sm text-muted-foreground">{client.contactName}</div>
                    </TableCell>
                     <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={owner?.photoURL ?? undefined} />
                                <AvatarFallback className="text-xs">{owner?.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{owner?.displayName ?? 'N/A'}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("capitalize", statusStyles[proposal.status])} variant="outline">{proposal.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(proposal.amount)}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">{new Date(proposal.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                );
              })}
               {!(proposalsLoading || clientsLoading) && proposals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No proposals found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bonus Tracker Section */}
       <Card>
        <CardHeader>
            <CardTitle>My Goals &amp; Bonuses</CardTitle>
            <CardDescription>Track your progress towards your next payout. Click a card to see the rewards!</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 lg:grid-cols-2 items-center">
            <div className="relative aspect-video w-full min-h-[30rem] hidden lg:block rounded-lg overflow-hidden">
                <Image
                    src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FHappy_Team_v2.png?alt=media&token=cfd3d9c7-acfc-4da8-93f4-6ad8d96cc325"
                    alt="Happy Team"
                    fill
                    className="object-cover"
                />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                 <BonusCard 
                    icon={<Target className="h-6 w-6 text-primary" />}
                    title="Corporate Closer Bonus"
                    value={`${dashboardData.corporateClientsThisMonth} / 3`}
                    progress={(dashboardData.corporateClientsThisMonth / 3) * 100}
                    goal={`Goal: 3 clients for ₱2,000`}
                    description="For SME, Commercial & Business clients.">
                     <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Corporate Closer Bonus</DialogTitle>
                            <DialogDescription>Reward for closing corporate clients. Claimed after clients complete their first paid month.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <p>Your current progress: <span className="font-bold">{dashboardData.corporateClientsThisMonth} clients</span></p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Target</TableHead>
                                        <TableHead>Bonus</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {closerBonusTiers.map(tier => (
                                        <TableRow key={tier.target} className={cn(dashboardData.corporateClientsThisMonth >= tier.target && "bg-green-100 dark:bg-green-900/50")}>
                                            <TableCell className="font-medium flex items-center gap-2">{tier.icon} Close {tier.target} new clients</TableCell>
                                            <TableCell className="font-bold text-primary">{currencyFormatter.format(tier.bonus)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                     </DialogContent>
                </BonusCard>

                <BonusCard 
                    icon={<Home className="h-6 w-6 text-primary" />}
                    title="Family Plan Closer Bonus"
                    value={`${dashboardData.individualClientsThisMonth} / ${dashboardData.individualClientsTarget}`}
                    progress={(dashboardData.individualClientsThisMonth / dashboardData.individualClientsTarget) * 100}
                    goal={`Goal: ${dashboardData.individualClientsTarget} clients for ₱2,500`}
                    description="For Family Plan clients.">
                     <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Family Plan Closer Bonus</DialogTitle>
                            <DialogDescription>Reward for bringing in household clients. Claimed after clients complete their first paid month.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <p>Your current progress: <span className="font-bold">{dashboardData.individualClientsThisMonth} clients</span></p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Target</TableHead>
                                        <TableHead>Bonus</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {individualCloserBonusTiers.map(tier => (
                                        <TableRow key={tier.target} className={cn(dashboardData.individualClientsThisMonth >= tier.target && "bg-green-100 dark:bg-green-900/50")}>
                                            <TableCell className="font-medium flex items-center gap-2">{tier.icon} Close {tier.target} new household clients</TableCell>
                                            <TableCell className="font-bold text-primary">{typeof tier.bonus === 'number' ? currencyFormatter.format(tier.bonus) : tier.bonus}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                     </DialogContent>
                </BonusCard>

                 <BonusCard 
                    icon={<Award className="h-6 w-6 text-primary" />}
                    title="Quarterly Growth Bonus"
                    value={`${currencyFormatter.format(dashboardData.quarterlySalesVolume)}`}
                    progress={(dashboardData.quarterlySalesVolume / dashboardData.quarterlyVolumeTarget) * 100}
                    goal={`Goal: ${currencyFormatter.format(200000)} volume for ₱5,000`}
                    description="Rewards expansion of your client base.">
                     <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Quarterly Growth Bonus</DialogTitle>
                            <DialogDescription>To reward expansion and total client base impact.</DialogDescription>
                        </DialogHeader>
                         <div className="space-y-4 py-4">
                            <p>Your current progress: <span className="font-bold">{currencyFormatter.format(dashboardData.quarterlySalesVolume)}</span> in new recurring volume this quarter.</p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metric</TableHead>
                                        <TableHead>Bonus</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {growthBonusTiers.map(tier => (
                                        <TableRow key={tier.target} className={cn(dashboardData.quarterlySalesVolume >= tier.target && "bg-green-100 dark:bg-green-900/50")}>
                                            <TableCell className="font-medium flex items-center gap-2">{tier.icon} Achieve {currencyFormatter.format(tier.target)}</TableCell>
                                            <TableCell className="font-bold text-primary">{tier.bonus}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                     </DialogContent>
                 </BonusCard>
                <BonusCard 
                    icon={<Power className="h-6 w-6 text-primary" />}
                    title="Prepayment Power-Up"
                    value={`${dashboardData.prepaidContracts} / 5`}
                    progress={(dashboardData.prepaidContracts / 5) * 100}
                    goal={`Goal: 5 prepaid contracts`}
                    description="Reward for closing long-term prepaid contracts.">
                     <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Prepayment Power-Up Bonus</DialogTitle>
                            <DialogDescription>Rewards for securing long-term financial commitments from clients.</DialogDescription>
                        </DialogHeader>
                         <div className="space-y-4 py-4">
                           <div className="grid grid-cols-2 gap-4">
                              <Card className="p-4">
                                  <p className="text-sm text-muted-foreground">Your Progress</p>
                                  <p className="text-2xl font-bold">{dashboardData.prepaidContracts} <span className="text-lg">/ {dashboardData.prepaidContractsTarget} contracts</span></p>
                              </Card>
                               <Card className="p-4">
                                  <p className="text-sm text-muted-foreground">Next Bonus At</p>
                                  <p className="text-2xl font-bold">
                                      {prepaymentProgressTiers.find(t => dashboardData.prepaidContracts < t.target)?.target || prepaymentProgressTiers[prepaymentProgressTiers.length - 1].target} contracts
                                  </p>
                              </Card>
                           </div>
                           
                            {dashboardData.prepaidContractsDetails.length > 0 && (
                              <div>
                                  <h4 className="font-semibold text-sm mb-2">Your Prepaid Contracts This Month:</h4>
                                  <div className="space-y-2">
                                      {dashboardData.prepaidContractsDetails.map((detail, index) => (
                                          <div key={index} className="flex justify-between items-center text-sm p-2 bg-muted rounded-md">
                                              <span>{detail.clientName}</span>
                                              <Badge variant="secondary">{detail.term}</Badge>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                           )}

                            <h4 className="font-semibold text-sm pt-4">Bonus Tiers</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Milestone</TableHead>
                                        <TableHead>Reward</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {prepaymentProgressTiers.map(tier => (
                                        <TableRow key={tier.target} className={cn(dashboardData.prepaidContracts >= tier.target && "bg-green-100 dark:bg-green-900/50")}>
                                            <TableCell className="font-medium">Close {tier.target} prepaid contracts</TableCell>
                                            <TableCell className="font-bold text-primary">{tier.reward}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                     </DialogContent>
                 </BonusCard>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
