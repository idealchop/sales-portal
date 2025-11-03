
'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  CircleDollarSign,
  UsersRound,
  TrendingUp,
  Repeat,
  Award,
  Target,
  HeartHandshake,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

import { proposals, commissionData, clients } from '@/lib/data';
import { RevenueChart } from '@/components/revenue-chart';
import { ClientPopover } from '@/components/client-popover';
import type { Client } from '@/lib/definitions';

const statusStyles: { [key: string]: string } = {
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const BonusCard = ({ icon, title, value, progress, goal, description }: { icon: React.ReactNode, title: string, value: string | number, progress: number, goal: string, description: string }) => (
    <Card>
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
)

export default function DashboardPage() {
  const getClientById = (id: string): Client | undefined => {
    return clients.find(c => c.id === id);
  }

  // Mock data for bonuses
  const clientsThisMonth = 2;
  const quarterlyVolume = 68000;
  const clientsForRetention = [
    { name: 'Solutions Inc.', anniversary: '3-month', date: 'in 12 days' },
    { name: 'Apex Industries', anniversary: '6-month', date: 'in 25 days' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex-1">
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Sandra! Here's your earnings and goals snapshot.</p>
      </div>

      {/* Commission Stats */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Estimated Monthly Commission
            </CardTitle>
            <CircleDollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱8,160</div>
            <p className="text-xs text-muted-foreground">
              +15% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recurring Commission Base</CardTitle>
            <Repeat className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱4,000</div>
            <p className="text-xs text-muted-foreground">
              Your stable monthly income
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Clients (This Month)</CardTitle>
            <UsersRound className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientsThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              1 away from ₱2,000 bonus
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Recurring Volume (Quarterly)</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{quarterlyVolume.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Target: ₱100,000 for ₱10k bonus
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bonus Tracker Section */}
       <Card>
        <CardHeader>
            <CardTitle>My Goals & Bonuses</CardTitle>
            <CardDescription>Track your progress towards your next payout.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <BonusCard 
                icon={<Target className="h-6 w-6 text-primary" />}
                title="Monthly Closer Bonus"
                value={`${clientsThisMonth} / 10`}
                progress={(clientsThisMonth / 10) * 100}
                goal="Goal: 3 clients for ₱2,000"
                description="Close 5 for ₱5k, 10 for ₱12k."
             />
             <BonusCard 
                icon={<Award className="h-6 w-6 text-primary" />}
                title="Quarterly Growth Bonus"
                value={`₱${(quarterlyVolume / 1000).toFixed(0)}k / ₱200k`}
                progress={(quarterlyVolume / 200000) * 100}
                goal="Goal: ₱50k volume for ₱5,000"
                description="Hit ₱200k for Elite Partner status."
             />
             <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                         <HeartHandshake className="h-6 w-6 text-primary" />
                        <CardTitle className="text-base font-semibold">Client Retention</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Clients nearing a retention bonus.</p>
                    <div className="space-y-3">
                        {clientsForRetention.map(client => (
                            <div key={client.name} className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={`https://picsum.photos/seed/${client.name}/32/32`} />
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
        </CardContent>
      </Card>


      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Commission History</CardTitle>
            <CardDescription>
              A summary of your commission earnings over the last 6 months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={commissionData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Recent Proposals</CardTitle>
              <CardDescription>
                Review your most recent sales proposals.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/dashboard/proposals">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.slice(0, 5).map((proposal) => {
                  const client = getClientById(proposal.client.id);
                  return (
                    <TableRow key={proposal.id}>
                      <TableCell>
                        {client ? (
                          <ClientPopover client={client}>
                            <div className="font-medium cursor-pointer hover:underline">{proposal.client.companyName}</div>
                          </ClientPopover>
                        ) : (
                          <div className="font-medium">{proposal.client.companyName}</div>
                        )}
                        <div className="text-sm text-muted-foreground hidden md:inline">
                          {proposal.client.contactName}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className={`capitalize ${statusStyles[proposal.status]}`} variant="outline">
                          {proposal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(proposal.amount)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
