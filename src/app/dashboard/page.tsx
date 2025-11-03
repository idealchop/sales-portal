
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

import { proposals, commissionData, clients } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { RevenueChart } from '@/components/revenue-chart';
import { ClientPopover } from '@/components/client-popover';
import type { Client } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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
  const getClientById = (id: string): Client | undefined => {
    return clients.find(c => c.id === id);
  }

  // Mock data for bonuses
  const clientsThisMonth = 2;
  const clientsThisMonthTarget = 3;
  const individualClientsThisMonth = 3;
  const individualClientsThisMonthTarget = 30;
  const quarterlyVolume = 68000;
  const quarterlyVolumeTarget = 100000;
  const clientsForRetention = [
    { name: 'Solutions Inc.', anniversary: '3-month', date: 'in 12 days', bonus: 500, avatarSeed: 'Solutions' },
    { name: 'Apex Industries', anniversary: '6-month', date: 'in 25 days', bonus: 1000, avatarSeed: 'Apex' },
    { name: 'Innovate Corp', anniversary: '12-month', date: 'in 2 months', bonus: 3000, avatarSeed: 'Innovate' },
  ]
  const closerBonusTiers = [
    { target: 3, bonus: 2000, icon: <Star className="h-5 w-5 text-yellow-400" /> },
    { target: 5, bonus: 5000, icon: <Star className="h-5 w-5 text-yellow-400" /> },
    { target: 10, bonus: 12000, icon: <Trophy className="h-5 w-5 text-amber-500" /> },
  ]
   const individualCloserBonusTiers = [
    { target: 10, bonus: 2500, icon: <Star className="h-5 w-5 text-yellow-400" /> },
    { target: 20, bonus: 6000, icon: <Trophy className="h-5 w-5 text-amber-500" /> },
    { target: 30, bonus: '₱15,000 + "Elite Closer" Badge', icon: <Award className="h-5 w-5 text-violet-500" /> },
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
  const recruitedPartners = 1;
  const teamRevenue = 42000;
  
  const prepaymentBonusTiers = [
    { term: 'Semi-Annual', bonus: '₱3,000' },
    { term: 'Annual', bonus: '₱5,000 + "Cash Flow Champion" Badge' },
  ];

  const prepaymentProgressTiers = [
    { target: 1, reward: '₱2,000' },
    { target: 3, reward: '₱7,500' },
    { target: 5, reward: '₱15,000 Milestone Bonus' },
  ];
  
  const prepaidContracts = 2;
  const prepaidContractsTarget = 5;

  const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

  const payoutTimeline = [
      { term: 'Monthly', schedule: 'Within 7–15 days after payment', example: 'e.g., Client pays Nov 1 → Commission by Nov 10–15' },
      { term: 'Quarterly', schedule: '⅓ each month after payment', example: 'e.g., Client pays Nov 1 → Payouts in Nov–Dec–Jan' },
      { term: 'Semi-Annual', schedule: 'Spread monthly for 6 months', example: 'e.g., Client pays Nov 1 → Paid monthly until Apr' },
      { term: 'Annual', schedule: 'Spread monthly for 12 months', example: 'e.g., Client pays Nov 1 → Paid monthly until Oct next year' },
  ];
  
  const monthlyCommissionBreakdown = [
    { client: 'Innovate Corp', amount: 3000, type: 'New Client' },
    { client: 'Solutions Inc.', amount: 1160, type: 'Renewal' },
    { client: 'Apex Industries', amount: 4000, type: 'Recurring' },
  ];
  const recurringCommissionBreakdown = [
    { client: 'Apex Industries', amount: 4000, type: 'Pro Plan' },
  ];

  // Productivity Metrics
  const proposalsSent = proposals.filter(p => p.status !== 'draft').length;
  const acceptedProposals = proposals.filter(p => p.status === 'accepted');
  const winRate = proposalsSent > 0 ? (acceptedProposals.length / proposalsSent) * 100 : 0;
  const totalAcceptedValue = acceptedProposals.reduce((sum, p) => sum + p.amount, 0);
  const avgDealSize = acceptedProposals.length > 0 ? totalAcceptedValue / acceptedProposals.length : 0;
  const newClientsThisMonth = 2; // Mock data

  return (
    <div className="flex flex-col gap-8">
      <div className="flex-1">
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Sandra! Here's your earnings and goals snapshot.</p>
      </div>

      {/* Commission Stats */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-primary to-[#3ab7b1] text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Commission</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₱8,160</div>
            <p className="text-xs text-primary-foreground/80">+15% from last month</p>
            <Dialog>
              <DialogTrigger asChild>
                <button className="text-xs text-primary-foreground/80 mt-2 underline">See breakdown</button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Monthly Commission Breakdown</DialogTitle>
                  <DialogDescription>Details of your commission earnings for this month.</DialogDescription>
                </DialogHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyCommissionBreakdown.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.client}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell className="text-right">{currencyFormatter.format(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Separator />
                <div className="flex justify-end font-bold">
                    <div className="grid grid-cols-2 gap-4 w-60">
                        <span>Total:</span>
                        <span className="text-right">{currencyFormatter.format(monthlyCommissionBreakdown.reduce((acc, item) => acc + item.amount, 0))}</span>
                    </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-primary to-[#3ab7b1] text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recurring Commission</CardTitle>
            <Repeat className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₱4,000</div>
            <p className="text-xs text-primary-foreground/80">Your stable monthly base income</p>
             <Dialog>
              <DialogTrigger asChild>
                <button className="text-xs text-primary-foreground/80 mt-2 underline">See breakdown</button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Recurring Commission Breakdown</DialogTitle>
                  <DialogDescription>Details of your recurring commission sources.</DialogDescription>
                </DialogHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recurringCommissionBreakdown.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.client}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell className="text-right">{currencyFormatter.format(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                 <Separator />
                <div className="flex justify-end font-bold">
                    <div className="grid grid-cols-2 gap-4 w-60">
                        <span>Total:</span>
                        <span className="text-right">{currencyFormatter.format(recurringCommissionBreakdown.reduce((acc, item) => acc + item.amount, 0))}</span>
                    </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-primary to-[#3ab7b1] text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Clients Bonus</CardTitle>
            <Target className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{clientsThisMonth} / {clientsThisMonthTarget}</div>
            <div className="mt-2 space-y-1">
              <Progress value={(clientsThisMonth / clientsThisMonthTarget) * 100} className="h-3 bg-primary-foreground/30" indicatorClassName="bg-primary-foreground" />
              <p className="text-xs text-primary-foreground/80">You're {clientsThisMonthTarget-clientsThisMonth} client away from your ₱2,000 bonus!</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-primary to-[#3ab7b1] text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quarterly Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₱{quarterlyVolume.toLocaleString()}</div>
             <div className="mt-2 space-y-1">
              <Progress value={(quarterlyVolume / quarterlyVolumeTarget) * 100} className="h-3 bg-primary-foreground/30" indicatorClassName="bg-primary-foreground" />
              <p className="text-xs text-primary-foreground/80">Target: {currencyFormatter.format(quarterlyVolumeTarget)} for a ₱10k bonus</p>
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
                <RevenueChart data={commissionData} />
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Commission Breakdown</DialogTitle>
                <DialogDescription>
                    This chart shows your commission history. Earnings from long-term client payments are distributed monthly to ensure a stable income.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-8 py-6 md:grid-cols-2">
                <div>
                  <RevenueChart data={commissionData} />
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
          <CardHeader>
            <CardTitle>Activity Snapshot</CardTitle>
            <CardDescription>Your key performance indicators for this month.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Proposals Sent</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{proposalsSent}</div>
                <p className="text-xs text-muted-foreground">Total proposals this month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Based on concluded proposals</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Deal Size</CardTitle>
                <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currencyFormatter.format(avgDealSize)}</div>
                <p className="text-xs text-muted-foreground">From accepted proposals</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{newClientsThisMonth}</div>
                <p className="text-xs text-muted-foreground">Clients acquired this month</p>
              </CardContent>
            </Card>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/proposals">View All Proposals</Link>
            </Button>
          </CardFooter>
        </Card>


      {/* Bonus Tracker Section */}
       <Card className="bg-background">
        <CardHeader>
            <CardTitle>My Goals & Bonuses</CardTitle>
            <CardDescription>Track your progress towards your next payout. Click a card to see the rewards!</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <BonusCard 
                icon={<Target className="h-6 w-6 text-primary" />}
                title="Corporate Closer Bonus"
                value={`${clientsThisMonth} / 10`}
                progress={(clientsThisMonth / 10) * 100}
                goal="Goal: 3 clients for ₱2,000"
                description="For SME, Commercial & Business clients.">
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Corporate Closer Bonus</DialogTitle>
                        <DialogDescription>Reward for closing corporate clients. Claimed after clients complete their first paid month.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p>Your current progress: <span className="font-bold">{clientsThisMonth} clients</span></p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Bonus</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {closerBonusTiers.map(tier => (
                                    <TableRow key={tier.target} className={cn(clientsThisMonth >= tier.target && "bg-green-100 dark:bg-green-900/50")}>
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
                title="Individual Closer Bonus"
                value={`${individualClientsThisMonth} / ${individualClientsThisMonthTarget}`}
                progress={(individualClientsThisMonth / individualClientsThisMonthTarget) * 100}
                goal={`Goal: 10 clients for ₱2,500`}
                description="For Individual (Household) clients.">
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Individual Closer Bonus</DialogTitle>
                        <DialogDescription>Reward for bringing in household clients. Claimed after clients complete their first paid month.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p>Your current progress: <span className="font-bold">{individualClientsThisMonth} clients</span></p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Bonus</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {individualCloserBonusTiers.map(tier => (
                                    <TableRow key={tier.target} className={cn(individualClientsThisMonth >= tier.target && "bg-green-100 dark:bg-green-900/50")}>
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
                value={`₱${(quarterlyVolume / 1000).toFixed(0)}k / ₱200k`}
                progress={(quarterlyVolume / 200000) * 100}
                goal="Goal: ₱50k volume for ₱5,000"
                description="Scale up with higher-volume enterprise accounts.">
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Quarterly Growth Bonus</DialogTitle>
                        <DialogDescription>Rewards the expansion of your client base and total liters sold.</DialogDescription>
                    </DialogHeader>
                     <div className="space-y-4">
                        <p>Your current progress: <span className="font-bold">{currencyFormatter.format(quarterlyVolume)}</span> in new volume</p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Metric</TableHead>
                                    <TableHead>Bonus</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {growthBonusTiers.map(tier => (
                                    <TableRow key={tier.target} className={cn(quarterlyVolume >= tier.target && "bg-green-100 dark:bg-green-900/50")}>
                                        <TableCell className="font-medium flex items-center gap-2">{tier.icon} Achieve {currencyFormatter.format(tier.target)}</TableCell>
                                        <TableCell className="font-bold text-primary">{tier.bonus}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                 </DialogContent>
             </BonusCard>

            <Dialog>
                <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-300">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                                <HeartHandshake className="h-6 w-6 text-primary" />
                                <CardTitle className="text-base font-semibold">Client Retention</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">Clients nearing a retention bonus.</p>
                            <div className="space-y-3">
                                {clientsForRetention.slice(0, 2).map(client => (
                                    <div key={client.name} className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={`https://picsum.photos/seed/${client.avatarSeed}/32/32`} />
                                            <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-sm">
                                            <p className="font-medium">{client.name}</p>
                                            <p className="text-xs text-muted-foreground">{client.anniversary} ({client.date})</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Client Retention Bonus</DialogTitle>
                        <DialogDescription>Strengthen client relationships and earn long-term rewards.</DialogDescription>
                    </DialogHeader>
                     <div className="space-y-4">
                        <p>Upcoming retention opportunities:</p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Milestone</TableHead>
                                    <TableHead>Bonus</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clientsForRetention.map(client => (
                                    <TableRow key={client.name}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={`https://picsum.photos/seed/${client.avatarSeed}/32/32`} />
                                                    <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{client.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-blue-500" /> {client.anniversary} ({client.date})</TableCell>
                                        <TableCell className="font-bold text-primary">{currencyFormatter.format(client.bonus)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

             <BonusCard 
                icon={<Users className="h-6 w-6 text-primary" />}
                title="Team Builder Bonus"
                value={`${recruitedPartners} / 3`}
                progress={(recruitedPartners / 3) * 100}
                goal="Goal: Recruit 3 active partners"
                description="Build your own team to unlock leadership bonuses.">
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Team Builder Incentive</DialogTitle>
                        <DialogDescription>Grow your income by building and leading your own team of sales partners.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <p>Recruited Partners: <span className="font-bold">{recruitedPartners}</span></p>
                            <p>Combined Team Revenue: <span className="font-bold">{currencyFormatter.format(teamRevenue)}</span></p>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Milestone</TableHead>
                                    <TableHead>Reward</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {teamBuilderTiers.map(tier => (
                                    <TableRow key={tier.milestone}>
                                        <TableCell className="font-medium">{tier.milestone}</TableCell>
                                        <TableCell className="font-bold text-primary">{tier.reward}</TableCell>
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
                value={`${prepaidContracts} / ${prepaidContractsTarget}`}
                progress={(prepaidContracts / prepaidContractsTarget) * 100}
                goal={`Goal: ${prepaidContractsTarget} prepaid contracts`}
                description="Reward for closing long-term prepaid contracts."
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Prepayment Power-Up Bonus</DialogTitle>
                        <DialogDescription>Earn extra for improving cash flow with upfront client payments.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p>Your current progress: <span className="font-bold">{prepaidContracts} prepaid contracts</span> closed.</p>
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
                                    <TableRow key={tier.target} className={cn(prepaidContracts >= tier.target && "bg-green-100 dark:bg-green-900/50")}>
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
        </CardContent>
      </Card>
    </div>
  );
}



    