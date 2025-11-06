

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
} from "@/components/ui/dialog"
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

import { RevenueChart } from '@/components/revenue-chart';
import { ClientPopover } from '@/components/client-popover';
import type { Client, Proposal } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { ActivityChart } from '@/components/activity-chart';
import { useProposals } from '@/hooks/use-proposals';
import { useClients } from '@/hooks/use-clients';
import { useMemo } from 'react';
import { subMonths, startOfMonth, endOfMonth, format, getQuarter, startOfQuarter, endOfQuarter, isWithinInterval, addMonths } from 'date-fns';
import { useUser } from '@/firebase';

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

export default function DashboardPage() {
  const { proposals, isLoading: proposalsLoading } = useProposals();
  const { clients, isLoading: clientsLoading } = useClients();
  const { user } = useUser();
  const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

  const getClientById = (id: string): Client | undefined => {
    return clients.find(c => c.id === id);
  }

  // Memoized calculations for dashboard data
  const dashboardData = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const currentMonthEnd = endOfMonth(now);
    const lastMonthEnd = endOfMonth(lastMonthStart);
    const currentQuarterStart = startOfQuarter(now);
    const currentQuarterEnd = endOfQuarter(now);

    const commissionRates: { [key: string]: number } = {
        household: 0.20,
        sme: 0.15,
        commercial: 0.15,
        corporate: 0.10,
        enterprise: 0.10,
    };

    const getCommission = (proposal: Proposal): number => {
        const client = getClientById(proposal.clientId);
        if (!client || !client.clientType) return 0;
        const rate = commissionRates[client.clientType] || 0;
        return proposal.amount * rate;
    };

    const acceptedProposals = proposals.filter(p => p.status === 'accepted');

    const acceptedThisMonth = acceptedProposals.filter(p => {
        const createdAt = new Date(p.createdAt);
        return createdAt >= currentMonthStart && createdAt <= currentMonthEnd;
    });

    const acceptedLastMonth = acceptedProposals.filter(p => {
        const createdAt = new Date(p.createdAt);
        return createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
    });

    const monthlyCommission = acceptedThisMonth.reduce((sum, p) => sum + getCommission(p), 0);
    const lastMonthCommission = acceptedLastMonth.reduce((sum, p) => sum + getCommission(p), 0);


    const commissionChange = lastMonthCommission > 0 
        ? ((monthlyCommission - lastMonthCommission) / lastMonthCommission) * 100 
        : (monthlyCommission > 0 ? 100 : 0);
    
    const getClientsFromProposals = (proposals: typeof acceptedThisMonth) => {
        const clientIds = new Set(proposals.map(p => p.clientId));
        return clients.filter(c => clientIds.has(c.id));
    };

    const newClientsObjectsThisMonth = getClientsFromProposals(acceptedThisMonth);
    const corporateClientsThisMonth = newClientsObjectsThisMonth.filter(c => c.clientType === 'corporate' || c.clientType === 'sme' || c.clientType === 'commercial').length;
    const individualClientsThisMonth = newClientsObjectsThisMonth.filter(c => c.clientType === 'household').length;

    const corporateClientsTarget = 10;
    const individualClientsTarget = 30;
    
    const quarterlyVolume = acceptedProposals
        .filter(p => {
            const createdAt = new Date(p.createdAt);
            return createdAt >= currentQuarterStart && createdAt <= currentQuarterEnd;
        })
        .reduce((sum, p) => sum + getCommission(p), 0);
    const quarterlyVolumeTarget = 200000;


    const commissionHistory = Array.from({ length: 6 }).map((_, i) => {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthName = format(monthDate, 'MMM');

        const revenue = acceptedProposals
            .filter(p => {
                const createdAt = new Date(p.createdAt);
                return createdAt >= monthStart && createdAt <= monthEnd;
            })
            .reduce((sum, p) => sum + getCommission(p), 0);
        
        return { month: monthName, revenue };
    }).reverse();

    const proposalsSent = proposals.filter(p => p.status !== 'draft').length;
    const winRate = proposalsSent > 0 ? (acceptedProposals.length / proposalsSent) * 100 : 0;
    
    const totalCommissionValue = acceptedProposals.reduce((sum, p) => sum + getCommission(p), 0);
    const avgDealSize = acceptedProposals.length > 0 ? totalCommissionValue / acceptedProposals.length : 0;

    const recentProposals = proposals.slice(0, 5);

    const activityData = [
      { name: 'Sent', value: proposalsSent, fill: 'hsl(var(--chart-2))' },
      { name: 'Accepted', value: acceptedProposals.length, fill: 'hsl(var(--chart-1))' },
    ];
    
    // --- Live Data Calculations for Bonuses ---

    // Recurring Commission: sum of monthly fees for all active clients
    const activeClientsWithSubscription = clients.filter(c => c.status === 'active' && c.subscription);
    const recurringCommission = activeClientsWithSubscription.reduce((sum, c) => sum + (c.subscription?.amount || 0), 0);

    // Retention Bonus: clients with anniversaries coming up
    const clientsForRetention = clients
        .filter(c => c.status === 'active' && c.subscription?.dateSigned)
        .map(c => {
            const dateSigned = new Date(c.subscription!.dateSigned!);
            const threeMonth = addMonths(dateSigned, 3);
            const sixMonth = addMonths(dateSigned, 6);
            const twelveMonth = addMonths(dateSigned, 12);
            let upcomingMilestone: { anniversary: string; date: Date; bonus: number } | null = null;
            
            if (isWithinInterval(threeMonth, { start: now, end: addMonths(now, 2) })) {
                upcomingMilestone = { anniversary: '3-month', date: threeMonth, bonus: 500 };
            } else if (isWithinInterval(sixMonth, { start: now, end: addMonths(now, 2) })) {
                upcomingMilestone = { anniversary: '6-month', date: sixMonth, bonus: 1000 };
            } else if (isWithinInterval(twelveMonth, { start: now, end: addMonths(now, 2) })) {
                upcomingMilestone = { anniversary: '12-month', date: twelveMonth, bonus: 3000 };
            }
            
            return upcomingMilestone ? { ...c, milestone: upcomingMilestone } : null;
        })
        .filter(Boolean)
        .slice(0, 3);

    // Team Builder
    const recruitedPartners = 1; // Assuming self is the first partner for now
    const teamRevenue = totalCommissionValue; 

    // Prepayment Power-Up
    const prepaidContracts = clients.filter(c => c.status === 'active' && c.subscription?.planId).length;
    const prepaidContractsTarget = 5;

    return {
        monthlyCommission,
        commissionChange,
        recurringCommission,
        corporateClientsThisMonth,
        corporateClientsTarget,
        individualClientsThisMonth,
        individualClientsTarget,
        quarterlyVolume,
        quarterlyVolumeTarget,
        commissionHistory,
        proposalsSent,
        winRate,
        avgDealSize,
        recentProposals,
        activityData,
        acceptedProposals,
        acceptedThisMonth,
        activeClientsWithSubscription,
        clientsForRetention,
        recruitedPartners,
        teamRevenue,
        prepaidContracts,
        prepaidContractsTarget
    };
  }, [proposals, clients]);

  // Static mock data for bonus tiers which are configuration, not dynamic data
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
    { target: 50000, bonus: '₱5,000', icon: <Star className="h-5 w-5 text-yellow-400" /> },
    { target: 100000, bonus: '₱10,000', icon: <Star className="h-5 w-5 text-yellow-400" /> },
    { target: 200000, bonus: '₱25,000 + Elite Partner Badge', icon: <Trophy className="h-5 w-5 text-amber-500" /> },
  ]
  const teamBuilderTiers = [
    { milestone: 'Recruit & train 3 active sales partners', reward: '₱3,000 one-time' },
    { milestone: 'Each sub-affiliate’s first 3 clients', reward: '₱500 per client' },
    { milestone: 'Reach ₱100,000 combined team revenue', reward: '₱5,000 leadership bonus' },
  ]
  const prepaymentBonusTiers = [
    { term: 'Semi-Annual', bonus: '₱3,000' },
    { term: 'Annual', bonus: '₱5,000 + "Cash Flow Champion" Badge' },
  ];
  const prepaymentProgressTiers = [
    { target: 1, reward: '₱2,000' },
    { target: 3, reward: '₱7,500' },
    { target: 5, reward: '₱15,000 Milestone Bonus' },
  ];
  const payoutTimeline = [
      { term: 'Monthly', schedule: 'Within 7–15 days after payment', example: 'e.g., Client pays Nov 1 → Commission by Nov 10–15' },
      { term: 'Quarterly', schedule: '⅓ each month after payment', example: 'e.g., Client pays Nov 1 → Payouts in Nov–Dec–Jan' },
      { term: 'Semi-Annual', schedule: 'Spread monthly for 6 months', example: 'e.g., Client pays Nov 1 → Paid monthly until Apr' },
      { term: 'Annual', schedule: 'Spread monthly for 12 months', example: 'e.g., Client pays Nov 1 → Paid monthly until Oct next year' },
  ];
  const commissionTiers = [
    { clientType: 'Family Plan', commission: '20%' },
    { clientType: 'SME', commission: '15%' },
    { clientType: 'Commercial', commission: '15%' },
    { clientType: 'Corporate & Enterprise', commission: '10%' },
  ];
  
  if (proposalsLoading || clientsLoading) {
      return (
        <div className="flex h-[80vh] w-full items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
      );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex-1">
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.displayName || 'Sandra'}! Here's your earnings and goals snapshot.</p>
      </div>

      {/* Commission Stats */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-primary to-[#3ab7b1] text-primary-foreground">
            <Dialog>
                <DialogTrigger asChild>
                    <div className="cursor-pointer p-6">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
                            <CardTitle className="text-sm font-medium">Monthly Commission</CardTitle>
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Monthly Commission Breakdown</DialogTitle>
                        <DialogDescription>
                            Showing accepted proposals for {format(new Date(), 'MMMM yyyy')}.
                        </DialogDescription>
                    </DialogHeader>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dashboardData.acceptedThisMonth.length > 0 ? dashboardData.acceptedThisMonth.map(p => {
                                const client = getClientById(p.clientId);
                                return (
                                    <TableRow key={p.id}>
                                        <TableCell>{client?.companyName || 'Unknown Client'}</TableCell>
                                        <TableCell className="text-right">{currencyFormatter.format(p.amount)}</TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center">No commissions this month.</TableCell>
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
                            <p className="text-xs text-primary-foreground/80">Your stable monthly base income</p>
                             <p className="text-xs text-primary-foreground/80 mt-2 underline">Click to see breakdown</p>
                        </CardContent>
                    </div>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Recurring Commission Breakdown</DialogTitle>
                        <DialogDescription>
                            Monthly fees from all your active clients.
                        </DialogDescription>
                    </DialogHeader>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead className="text-right">Monthly Fee</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {dashboardData.activeClientsWithSubscription.length > 0 ? dashboardData.activeClientsWithSubscription.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell>{c.companyName}</TableCell>
                                    <TableCell>{c.subscription?.planName || 'N/A'}</TableCell>
                                    <TableCell className="text-right">{currencyFormatter.format(c.subscription?.amount || 0)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">No active recurring subscriptions.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </DialogContent>
            </Dialog>
        </Card>
        <Card className="bg-gradient-to-r from-primary to-[#3ab7b1] text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Corp. Clients Bonus</CardTitle>
            <Target className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData.corporateClientsThisMonth} / 3</div>
            <div className="mt-2 space-y-1">
              <Progress value={(dashboardData.corporateClientsThisMonth / 3) * 100} className="h-3 bg-primary-foreground/30" indicatorClassName="bg-primary-foreground" />
              <p className="text-xs text-primary-foreground/80">You're {Math.max(0, 3 - dashboardData.corporateClientsThisMonth)} client(s) away from your ₱2,000 bonus!</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-primary to-[#3ab7b1] text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quarterly Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currencyFormatter.format(dashboardData.quarterlyVolume)}</div>
             <div className="mt-2 space-y-1">
              <Progress value={(dashboardData.quarterlyVolume / dashboardData.quarterlyVolumeTarget) * 100} className="h-3 bg-primary-foreground/30" indicatorClassName="bg-primary-foreground" />
              <p className="text-xs text-primary-foreground/80">Target: {currencyFormatter.format(dashboardData.quarterlyVolumeTarget)} for a ₱25k bonus</p>
            </div>
          </CardContent>
        </Card>
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
                <DialogTitle>Recurring Commission &amp; Payouts</DialogTitle>
                <DialogDescription>
                    This chart shows your commission history. Earnings from long-term client payments are distributed monthly to ensure a stable income.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-8 py-6 md:grid-cols-2">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Commission Rate by Client Type</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client Type</TableHead>
                                <TableHead className="text-right">Commission</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {commissionTiers.map((tier) => (
                                <TableRow key={tier.clientType}>
                                    <TableCell className="font-medium">{tier.clientType}</TableCell>
                                    <TableCell className="text-right font-bold text-primary">{tier.commission}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2">Payout Timeline Explained</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client Payment Term</TableHead>
                                <TableHead>Payout Schedule</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payoutTimeline.map((item) => (
                                <TableRow key={item.term}>
                                    <TableCell className="font-medium">{item.term}</TableCell>
                                    <TableCell>{item.schedule}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                     <p className="text-xs text-muted-foreground mt-4">
                        Example: A client pays for a full year in November. Your commission for that sale will be paid out in 12 monthly installments from November of this year to October of the next.
                    </p>
                </div>
                 <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold mb-2">6-Month Commission History</h3>
                    <RevenueChart data={dashboardData.commissionHistory} />
                </div>
            </div>
          </DialogContent>
        </Dialog>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Sales Materials</CardTitle>
            <CardDescription>Your toolkit for success.</CardDescription>
          </CardHeader>
          <div className="relative h-48 w-full">
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden md:table-cell text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(proposalsLoading || clientsLoading) && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Loading proposals...
                  </TableCell>
                </TableRow>
              )}
              {!(proposalsLoading || clientsLoading) && dashboardData.recentProposals.map((proposal) => {
                const client = getClientById(proposal.clientId);
                if (!client) return null;
                return (
                  <TableRow key={proposal.id}>
                    <TableCell>
                      <ClientPopover client={client}>
                        <div className="font-medium text-primary hover:underline cursor-pointer">{client.companyName}</div>
                      </ClientPopover>
                      <div className="text-sm text-muted-foreground">{client.contactName}</div>
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
                  <TableCell colSpan={4} className="h-24 text-center">
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
            <div className="relative h-full w-full min-h-[30rem] hidden lg:block rounded-lg overflow-hidden">
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
                    value={`${dashboardData.corporateClientsThisMonth} / 10`}
                    progress={(dashboardData.corporateClientsThisMonth / 10) * 100}
                    goal="Goal: 3 clients for ₱2,000"
                    description="For SME, Commercial &amp; Business clients.">
                     <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Corporate Closer Bonus</DialogTitle>
                            <DialogDescription>Reward for closing corporate clients. Claimed after clients complete their first paid month.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
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
                    goal={`Goal: 10 clients for ₱2,500`}
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
                    value={`${currencyFormatter.format(dashboardData.quarterlyVolume)} / ${currencyFormatter.format(dashboardData.quarterlyVolumeTarget)}`}
                    progress={(dashboardData.quarterlyVolume / dashboardData.quarterlyVolumeTarget) * 100}
                    goal={`Goal: ${currencyFormatter.format(50000)} volume for ₱5,000`}
                    description="Scale up with higher-volume enterprise accounts.">
                     <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Quarterly Growth Bonus</DialogTitle>
                            <DialogDescription>Rewards the expansion of your client base and total liters sold.</DialogDescription>
                        </DialogHeader>
                         <div className="space-y-4">
                            <p>Your current progress: <span className="font-bold">{currencyFormatter.format(dashboardData.quarterlyVolume)}</span> in new volume</p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metric</TableHead>
                                        <TableHead>Bonus</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {growthBonusTiers.map(tier => (
                                        <TableRow key={tier.target} className={cn(dashboardData.quarterlyVolume >= tier.target && "bg-green-100 dark:bg-green-900/50")}>
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
                    icon={<CreditCard className="h-6 w-6 text-primary" />}
                    title="Prepayment Power-Up"
                    value={`${dashboardData.prepaidContracts} / ${dashboardData.prepaidContractsTarget}`}
                    progress={(dashboardData.prepaidContracts / dashboardData.prepaidContractsTarget) * 100}
                    goal={`Goal: ${dashboardData.prepaidContractsTarget} prepaid contracts`}
                    description="Reward for closing long-term prepaid contracts."
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Prepayment Power-Up Bonus</DialogTitle>
                            <DialogDescription>Earn extra for improving cash flow with upfront client payments.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <p>Your current progress: <span className="font-bold">{dashboardData.prepaidContracts} prepaid contracts</span> closed.</p>
                            <Separator />
                            <h4 className="font-semibold">Commission Per Contract</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Prepayment Term</TableHead>
                                        <TableHead>Bonus per Contract</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {prepaymentBonusTiers.map(tier => (
                                        <TableRow key={tier.term}>
                                            <TableCell className="font-medium">{tier.term}</TableCell>
                                            <TableCell className="font-bold text-primary">{tier.bonus}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Separator />
                            <h4 className="font-semibold">Milestone Bonus</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Contracts Closed (this quarter)</TableHead>
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
                            <p className="text-xs text-muted-foreground">Commissions and bonuses are paid out after the client's payment is confirmed.</p>
                        </div>
                    </DialogContent>
                </BonusCard>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
