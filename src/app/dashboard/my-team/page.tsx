
'use client';

import { useMemo, useState } from 'react';
import { useUser } from '@/firebase';
import { useSalesUsers } from '@/hooks/use-sales-users';
import { useAllProposals } from '@/hooks/use-all-proposals';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Users, Trophy, Award, FileSignature, Target, CircleDollarSign, BarChart3, ArrowUp, ArrowDown, CalendarDays, BarChart as BarChartIcon, Phone, Mail, Eye } from 'lucide-react';
import type { UserProfile, Proposal, Client } from '@/lib/definitions';
import { WithId } from '@/firebase';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useClients } from '@/hooks/use-clients';
import { ClientOverviewDialog } from '@/components/client-overview-dialog';
import { useAllClients } from '@/hooks/use-all-clients';

const proposalStatusStyles: { [key: string]: string } = {
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  finalized: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};


const CustomBarLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  return (
    <text x={x + width / 2} y={y} fill="hsl(var(--foreground))" textAnchor="middle" dy={-6} fontSize={12}>
      {value}
    </text>
  );
};

const CustomXAxisTick = (props: any) => {
    const { x, y, payload, salesUsers } = props;
    const user = salesUsers.find((u: WithId<UserProfile>) => u.id === payload.value);
    
    if (user) {
        return (
            <g transform={`translate(${x},${y})`}>
                <foreignObject x={-16} y={8} width={32} height={32}>
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                        <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                </foreignObject>
            </g>
        );
    }
    return null;
}


export default function MyTeamPage() {
  const { user, isManager } = useUser();
  const { salesUsers, isLoading: usersLoading } = useSalesUsers();
  const { proposals, isLoading: proposalsLoading } = useAllProposals();
  const { clients, isLoading: clientsLoading } = useAllClients();
  const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
  const [proposalsByRepPeriod, setProposalsByRepPeriod] = useState<string>('all');
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);


  const myTeam = useMemo(() => {
    if (!user || !isManager || usersLoading) return [];

    const managerTeamName = `${user.location} (${user.displayName})`;

    return salesUsers.filter(
      (salesUser) => salesUser.role === 'sales' && salesUser.team === managerTeamName
    );
  }, [user, isManager, salesUsers, usersLoading]);

  const teamPerformance = useMemo(() => {
    if (proposalsLoading || myTeam.length === 0) return { leaderboard: [], kpis: {}, availableMonths: [], proposalsByRep: [] };
    
    const teamMemberIds = new Set(myTeam.map(m => m.id));
    const teamProposals = proposals.filter(p => teamMemberIds.has(p.userId));

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(lastMonthStart);

    const getValidDate = (timestamp: string | number | undefined | Date) => {
        if (!timestamp) return null;
        try {
            const d = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
            return isNaN(d.getTime()) ? null : d;
        } catch {
            return null;
        }
    }

    const leaderboardData = myTeam.map((member) => {
      const userProposals = teamProposals.filter((p) => p.userId === member.id);
      const acceptedProposals = userProposals.filter((p) => p.status === 'accepted');
      const sentProposals = userProposals.filter((p) => ['sent', 'accepted', 'rejected', 'finalized'].includes(p.status));
      const totalRevenue = acceptedProposals.reduce((sum, p) => sum + p.amount, 0);
      const winRate = sentProposals.length > 0 ? (acceptedProposals.length / sentProposals.length) * 100 : 0;
      const avgSale = acceptedProposals.length > 0 ? totalRevenue / acceptedProposals.length : 0;

      return {
        ...member,
        proposalsWon: acceptedProposals.length,
        totalRevenue,
        winRate,
        avgSale,
        proposals: userProposals,
      };
    });

    const sentProposalsAllTime = teamProposals.filter(p => ['sent', 'accepted', 'rejected', 'finalized'].includes(p.status));
    const acceptedProposalsAllTime = teamProposals.filter(p => p.status === 'accepted');

    const totalProposalsSent = sentProposalsAllTime.length;
    const teamWinRate = totalProposalsSent > 0 ? (acceptedProposalsAllTime.length / totalProposalsSent) * 100 : 0;
    const totalRevenue = acceptedProposalsAllTime.reduce((sum,p) => sum + p.amount, 0);
    const avgDealSize = acceptedProposalsAllTime.length > 0 ? totalRevenue / acceptedProposalsAllTime.length : 0;
    
    const sentThisMonth = sentProposalsAllTime.filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: currentMonthStart, end: now }));
    const sentLastMonth = sentProposalsAllTime.filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: lastMonthStart, end: lastMonthEnd }));
    const proposalsSentChange = sentLastMonth.length > 0 ? ((sentThisMonth.length - sentLastMonth.length) / sentLastMonth.length) * 100 : sentThisMonth.length > 0 ? 100 : 0;
    
    const acceptedThisMonth = acceptedProposalsAllTime.filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: currentMonthStart, end: now }));
    const acceptedLastMonth = acceptedProposalsAllTime.filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: lastMonthStart, end: lastMonthEnd }));

    const winRateThisMonth = sentThisMonth.length > 0 ? (acceptedThisMonth.length / sentThisMonth.length) * 100 : 0;
    const winRateLastMonth = sentLastMonth.length > 0 ? (acceptedLastMonth.length / sentLastMonth.length) * 100 : 0;
    const winRateChange = winRateLastMonth > 0 ? ((winRateThisMonth - winRateLastMonth) / winRateLastMonth) * 100 : winRateThisMonth > 0 ? 100 : 0;
    
    const revenueThisMonth = acceptedThisMonth.reduce((sum, p) => sum + p.amount, 0);
    const revenueLastMonth = acceptedLastMonth.reduce((sum, p) => sum + p.amount, 0);
    const totalRevenueChange = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : revenueThisMonth > 0 ? 100 : 0;
    
    const avgDealSizeThisMonth = acceptedThisMonth.length > 0 ? revenueThisMonth / acceptedThisMonth.length : 0;
    const avgDealSizeLastMonth = acceptedLastMonth.length > 0 ? revenueLastMonth / acceptedLastMonth.length : 0;
    const avgDealSizeChange = avgDealSizeLastMonth > 0 ? ((avgDealSizeThisMonth - avgDealSizeLastMonth) / avgDealSizeLastMonth) * 100 : avgDealSizeThisMonth > 0 ? 100 : 0;

    const availableMonths = Array.from(new Set(teamProposals.map(p => p.createdAt ? format(new Date(p.createdAt), 'MMMM yyyy') : null).filter(Boolean) as string[]))
        .sort((a,b) => new Date(b).getTime() - new Date(a).getTime());

    const filteredRepProposals = proposalsByRepPeriod === 'all'
        ? teamProposals
        : teamProposals.filter(p => {
            if (!p.createdAt) return false;
            try {
                const proposalDate = typeof p.createdAt === 'string' ? parseISO(p.createdAt) : new Date(p.createdAt);
                return format(proposalDate, 'MMMM yyyy') === proposalsByRepPeriod;
            } catch {
                return false;
            }
        });

    const proposalCountsByRep = filteredRepProposals.reduce((acc, proposal) => {
        acc[proposal.userId] = (acc[proposal.userId] || 0) + 1;
        return acc;
    }, {} as { [key: string]: number });
    
    const proposalsByRep = Object.entries(proposalCountsByRep).map(([userId, count]) => {
        const user = myTeam.find(u => u.id === userId);
        return {
            userId: userId,
            name: user?.displayName || 'Unknown',
            proposals: count
        };
    }).sort((a, b) => b.proposals - a.proposals);


    return {
        leaderboard: leaderboardData.sort((a, b) => b.totalRevenue - a.totalRevenue),
        kpis: {
            totalProposalsSent,
            teamWinRate,
            totalRevenue,
            avgDealSize,
            proposalsSentChange,
            winRateChange,
            totalRevenueChange,
            avgDealSizeChange,
        },
        availableMonths,
        proposalsByRep,
    };
  }, [proposals, myTeam, proposalsLoading, proposalsByRepPeriod]);

  const isLoading = usersLoading || proposalsLoading || clientsLoading;

  if (isLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isManager) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>This page is only available to Sales Managers.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Team</h1>
        <p className="text-muted-foreground">Monitor the performance of your sales executives.</p>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Proposals Sent</CardTitle>
                    <FileSignature className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{teamPerformance.kpis.totalProposalsSent || 0}</div>
                    <p className={cn("text-xs text-muted-foreground flex items-center", (teamPerformance.kpis.proposalsSentChange || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                        {(teamPerformance.kpis.proposalsSentChange || 0) >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        {(teamPerformance.kpis.proposalsSentChange || 0).toFixed(1)}% from last month
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Team Win Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{(teamPerformance.kpis.teamWinRate || 0).toFixed(1)}%</div>
                     <p className={cn("text-xs text-muted-foreground flex items-center", (teamPerformance.kpis.winRateChange || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                        {(teamPerformance.kpis.winRateChange || 0) >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        {(teamPerformance.kpis.winRateChange || 0).toFixed(1)}% from last month
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue Generated</CardTitle>
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{currencyFormatter.format(teamPerformance.kpis.totalRevenue || 0)}</div>
                    <p className={cn("text-xs text-muted-foreground flex items-center", (teamPerformance.kpis.totalRevenueChange || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                        {(teamPerformance.kpis.totalRevenueChange || 0) >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        {(teamPerformance.kpis.totalRevenueChange || 0).toFixed(1)}% from last month
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Deal Size</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{currencyFormatter.format(teamPerformance.kpis.avgDealSize || 0)}</div>
                     <p className={cn("text-xs text-muted-foreground flex items-center", (teamPerformance.kpis.avgDealSizeChange || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                        {(teamPerformance.kpis.avgDealSizeChange || 0) >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        {(teamPerformance.kpis.avgDealSizeChange || 0).toFixed(1)}% from last month
                    </p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <BarChartIcon className="h-5 w-5" />
                            Proposals by Team Member
                        </CardTitle>
                        <CardDescription>Total proposals created by each executive.</CardDescription>
                    </div>
                    <Select value={proposalsByRepPeriod} onValueChange={setProposalsByRepPeriod}>
                        <SelectTrigger className="w-auto px-3">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            {teamPerformance.availableMonths.map(month => <SelectItem key={month} value={month}>{month}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="h-[250px] pr-6">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamPerformance.proposalsByRep} margin={{ top: 20, right: 0, left: 0, bottom: 20 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis 
                            dataKey="userId" 
                            tickLine={false} 
                            axisLine={false} 
                            tick={<CustomXAxisTick salesUsers={myTeam} />}
                            interval={0}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))' }}
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: 'var(--radius)'
                            }}
                            labelFormatter={(value) => {
                                const user = myTeam.find(u => u.id === value);
                                return user ? user.displayName : 'Unknown';
                            }}
                        />
                        <Bar dataKey="proposals" fill="hsl(var(--primary))" radius={4} barSize={20} label={<CustomBarLabel />} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>


      <Card>
        <CardHeader>
          <CardTitle>Team Leaderboard</CardTitle>
          <CardDescription>Performance ranking of your team members.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Sales Executive</TableHead>
                <TableHead>Proposals Won</TableHead>
                <TableHead>Win Rate</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamPerformance.leaderboard && teamPerformance.leaderboard.length > 0 ? (
                teamPerformance.leaderboard.map((rep, index) => {
                  const rank = index + 1;
                  return (
                    <TableRow key={rep.id}>
                      <TableCell className="font-bold text-lg">
                        {rank === 1 && <Trophy className="w-6 h-6 text-yellow-400" />}
                        {rank === 2 && <Award className="w-6 h-6 text-gray-400" />}
                        {rank === 3 && <Award className="w-6 h-6 text-orange-400" />}
                        {rank > 3 && rank}
                      </TableCell>
                      <TableCell>
                        <Popover>
                            <PopoverTrigger asChild>
                                <div className="flex items-center gap-3 cursor-pointer">
                                  <Avatar>
                                    <AvatarImage src={rep.photoURL} />
                                    <AvatarFallback>{rep.displayName?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium hover:underline">{rep.displayName}</p>
                                    <p className="text-sm text-muted-foreground">{rep.email}</p>
                                  </div>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-16 w-16">
                                            <AvatarImage src={rep.photoURL} />
                                            <AvatarFallback className="text-xl">{rep.displayName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="font-semibold text-lg">{rep.displayName}</h3>
                                            <p className="text-sm text-muted-foreground">{rep.email}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm border-t pt-4">
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <span>{rep.phone || 'N/A'}</span>
                                        </div>
                                         <div className="flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                            <span>{rep.birthday ? format(new Date(rep.birthday), 'PPP') : 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3 border-t pt-4">
                                         <h4 className="font-semibold text-sm">Performance Summary</h4>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Total Revenue</span>
                                            <span className="font-semibold">{currencyFormatter.format(rep.totalRevenue)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Proposals Won</span>
                                            <span className="font-semibold">{rep.proposalsWon}</span>
                                        </div>
                                         <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Average Sale</span>
                                            <span className="font-semibold">{currencyFormatter.format(rep.avgSale)}</span>
                                        </div>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>{rep.proposalsWon}</TableCell>
                      <TableCell>{rep.winRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-semibold">{currencyFormatter.format(rep.totalRevenue)}</TableCell>
                       <TableCell className="text-center">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Eye className="mr-2 h-4 w-4" /> View
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>Proposals by {rep.displayName}</DialogTitle>
                                    <DialogDescription>A list of all proposals created by this sales executive.</DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="h-[60vh]">
                                <Table>
                                    <TableHeader>
                                    <TableRow>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {rep.proposals.length > 0 ? (
                                        rep.proposals.map(p => {
                                        const client = clientMap.get(p.clientId);
                                        return (
                                            <TableRow key={p.id}>
                                            <TableCell className="font-medium">
                                                {client ? client.companyName : 'N/A'}
                                            </TableCell>
                                            <TableCell>{currencyFormatter.format(p.amount)}</TableCell>
                                            <TableCell>
                                                <Badge className={cn("capitalize", p.status && proposalStatusStyles[p.status])} variant="outline">{p.status}</Badge>
                                            </TableCell>
                                            <TableCell>{format(new Date(p.createdAt), 'PPP')}</TableCell>
                                            <TableCell className="text-right">
                                                {client && (
                                                    <ClientOverviewDialog client={client} proposal={p} allUsers={salesUsers} view="clients">
                                                        <Button variant="ghost" size="sm">View Client</Button>
                                                    </ClientOverviewDialog>
                                                )}
                                            </TableCell>
                                            </TableRow>
                                        )
                                        })
                                    ) : (
                                        <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">No proposals found.</TableCell>
                                        </TableRow>
                                    )}
                                    </TableBody>
                                </Table>
                                </ScrollArea>
                            </DialogContent>
                        </Dialog>
                       </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No sales executives found on your team yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


    