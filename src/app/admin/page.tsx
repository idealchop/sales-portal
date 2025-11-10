
'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileText, Users, CircleDollarSign, Percent, CreditCard, UsersRound, Trophy, Award, Activity, Star, BarChart3 } from 'lucide-react';
import { useAllProposals } from '@/hooks/use-all-proposals';
import { useAllClients } from '@/hooks/use-all-clients';
import { useSalesUsers } from '@/hooks/use-sales-users';
import { useAllCommissions } from '@/hooks/use-all-commissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { ClientOverviewDialog } from '@/components/client-overview-dialog';
import type { UserProfile, Client, Proposal, Commission } from '@/lib/definitions';
import { WithId } from '@/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';


const clientStatusStyles: { [key: string]: string } = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
};

const commissionStatusStyles: { [key: string]: string } = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
};


const AdminDashboardSkeleton = () => (
  <div className="space-y-8">
    <div>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 mt-2" />
    </div>
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
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
         <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);


const ClientDataTable = ({ clients, users, proposals }: { clients: WithId<Client>[], users: WithId<UserProfile>[], proposals: WithId<Proposal>[] }) => {
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    const proposalsByClient = useMemo(() => {
        return proposals.reduce((acc, p) => {
            if (!acc[p.clientId]) {
                acc[p.clientId] = [];
            }
            acc[p.clientId].push(p);
            return acc;
        }, {} as { [key: string]: Proposal[] });
    }, [proposals]);

    const getOnboardingProgress = (client: Client) => {
        if (!client.onboardingStatus || client.onboardingStatus.length === 0) return 0;
        const completedSteps = client.onboardingStatus.filter(step => step.status === 'completed').length;
        return (completedSteps / client.onboardingStatus.length) * 100;
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>All Clients</CardTitle>
                <CardDescription>A complete list of every client in the system.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Sales Rep</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Onboarding</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clients.map(client => {
                            const clientProposals = proposalsByClient[client.id] || [];
                            const latestProposal = clientProposals[0];
                            const salesRep = latestProposal ? userMap.get(latestProposal.userId) : userMap.get(client.userId);
                            const progress = getOnboardingProgress(client);
                            return (
                                <ClientOverviewDialog key={client.id} client={client} proposal={latestProposal} allUsers={users} view="clients">
                                    <TableRow className="cursor-pointer">
                                        <TableCell>
                                            <div className="font-medium">{client.companyName}</div>
                                            <div className="text-sm text-muted-foreground">{client.contactName}</div>
                                        </TableCell>
                                        <TableCell>
                                            {salesRep ? (
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={salesRep.photoURL} />
                                                        <AvatarFallback>{salesRep.displayName?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm">{salesRep.displayName}</span>
                                                </div>
                                            ) : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn("capitalize", client.status && clientStatusStyles[client.status])}>{client.status || 'N/A'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {client.status === 'active' && client.onboardingStatus ? (
                                                <div className="flex items-center gap-2">
                                                    <Progress value={progress} className="w-24 h-2" />
                                                    <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                                                </div>
                                            ) : client.status === 'active' ? (
                                                <div className="flex items-center gap-2">
                                                     <Progress value={0} className="w-24 h-2" />
                                                    <span className="text-xs text-muted-foreground">0%</span>
                                                </div>
                                            ) : null}
                                        </TableCell>
                                    </TableRow>
                                </ClientOverviewDialog>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

const SalesTeamLeaderboard = ({ users, proposals }: { users: WithId<UserProfile>[], proposals: WithId<Proposal>[] }) => {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

    const leaderboardData = useMemo(() => {
        return users.map(user => {
            const userProposals = proposals.filter(p => p.userId === user.id);
            const acceptedProposals = userProposals.filter(p => p.status === 'accepted');
            const sentProposals = userProposals.filter(p => ['sent', 'accepted', 'rejected', 'finalized'].includes(p.status));
            const totalRevenue = acceptedProposals.reduce((sum, p) => sum + p.amount, 0);
            const winRate = sentProposals.length > 0 ? (acceptedProposals.length / sentProposals.length) * 100 : 0;
            
            return {
                ...user,
                proposalsWon: acceptedProposals.length,
                totalRevenue,
                winRate
            };
        }).sort((a, b) => b.totalRevenue - a.totalRevenue);
    }, [users, proposals]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sales Team Leaderboard</CardTitle>
                <CardDescription>Performance ranking of all sales representatives.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Sales Rep</TableHead>
                            <TableHead>Proposals Won</TableHead>
                            <TableHead>Win Rate</TableHead>
                            <TableHead className="text-right">Total Revenue</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leaderboardData.map((rep, index) => (
                            <TableRow key={rep.id}>
                                <TableCell className="font-bold text-lg">
                                    {index === 0 && <Trophy className="w-6 h-6 text-yellow-400" />}
                                    {index === 1 && <Award className="w-6 h-6 text-gray-400" />}
                                    {index === 2 && <Award className="w-6 h-6 text-orange-400" />}
                                    {index > 2 && index + 1}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={rep.photoURL} />
                                            <AvatarFallback>{rep.displayName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{rep.displayName}</p>
                                            <p className="text-sm text-muted-foreground">{rep.email}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{rep.proposalsWon}</TableCell>
                                <TableCell>{rep.winRate.toFixed(1)}%</TableCell>
                                <TableCell className="text-right font-semibold">{currencyFormatter.format(rep.totalRevenue)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

const CommissionPayoutsTable = ({ commissions, users, clients, proposals }: { commissions: WithId<Commission>[], users: WithId<UserProfile>[], clients: WithId<Client>[], proposals: WithId<Proposal>[] }) => {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    
    // Create a map from proposalId to its client
    const proposalClientMap = useMemo(() => {
        const map = new Map<string, WithId<Client>>();
        proposals.forEach(proposal => {
            const client = clients.find(c => c.id === proposal.clientId);
            if (client) {
                map.set(proposal.id, client);
            }
        });
        return map;
    }, [clients, proposals]);


    const getClientName = (commission: Commission) => {
        if (commission.clientName) return commission.clientName;
        const client = proposalClientMap.get(commission.proposalId);
        return client ? client.companyName : 'N/A';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Commission Payouts</CardTitle>
                <CardDescription>A log of all commission records across the organization.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sales Rep</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {commissions.map(commission => {
                            const salesRep = userMap.get(commission.userId);
                            const clientName = getClientName(commission);
                            return (
                                <TableRow key={commission.id}>
                                    <TableCell>
                                        {salesRep ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={salesRep.photoURL} />
                                                    <AvatarFallback>{salesRep.displayName?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">{salesRep.displayName}</span>
                                            </div>
                                        ) : 'N/A'}
                                    </TableCell>
                                    <TableCell>{clientName}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("capitalize", commission.status && commissionStatusStyles[commission.status])}>
                                            {commission.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(commission.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right font-semibold">{currencyFormatter.format(commission.amount)}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
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


export default function AdminPage() {
  const { proposals, isLoading: proposalsLoading } = useAllProposals();
  const { clients, isLoading: clientsLoading } = useAllClients();
  const { salesUsers, isLoading: usersLoading } = useSalesUsers();
  const { commissions, isLoading: commissionsLoading } = useAllCommissions();
  const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

  const stats = useMemo(() => {
    if (proposalsLoading || clientsLoading || usersLoading) {
      return { totalRevenue: 0, activeClients: 0, salesReps: 0, winRate: 0, pendingClients: 0, totalProposals: 0, proposalPerClient: 0, planDistribution: [], clientStatusDistribution: [], clientStatusChartData: [], proposalFunnelData: [], proposalsByRep: [] };
    }

    const acceptedProposals = proposals.filter(p => p.status === 'accepted');
    const totalRevenue = acceptedProposals.reduce((sum, p) => sum + p.amount, 0);

    const activeClients = clients.filter(c => c.status === 'active').length;
    const pendingClients = clients.filter(c => c.status === 'pending').length;
    const inactiveClients = clients.filter(c => c.status === 'inactive').length;
    const totalClients = clients.length;
    const salesReps = salesUsers.length;

    const sentProposals = proposals.filter(p => ['sent', 'accepted', 'rejected', 'finalized'].includes(p.status));
    const sentProposalsCount = sentProposals.length;
    const winRate = sentProposalsCount > 0 ? (acceptedProposals.length / sentProposalsCount) * 100 : 0;
    const totalProposals = proposals.length;
    const proposalPerClient = totalClients > 0 ? totalProposals / totalClients : 0;
    
    const clientMap = new Map(clients.map(c => [c.id, c]));
    const clientTypeMap: { [key: string]: string } = {
        household: 'Family',
        sme: 'SME',
        commercial: 'Commercial',
        corporate: 'Corporate',
        enterprise: 'Enterprise'
    };
    
    const clientStatusDistribution = [
      { name: 'Active', value: activeClients, fill: 'hsl(var(--chart-1))' },
      { name: 'Pending', value: pendingClients, fill: 'hsl(var(--chart-4))' },
      { name: 'Inactive', value: inactiveClients, fill: 'hsl(var(--chart-2))' },
    ];
    
    const clientStatusChartData = [
      { name: 'Active', value: activeClients },
      { name: 'Pending', value: pendingClients },
      { name: 'Inactive', value: inactiveClients },
    ];

    const planCounts: { [key: string]: number } = {};
    acceptedProposals.forEach(p => {
        const client = clientMap.get(p.clientId);
        if (p.content) {
            try {
                const content = JSON.parse(p.content);
                const planName = content.summaryTitle?.replace(' Plan', '') || 'Unknown';
                let clientCategory = 'Other';
                
                 if (content.plan?.id?.includes('enterprise')) {
                    clientCategory = 'Enterprise';
                } else if (client && client.clientType) {
                    clientCategory = clientTypeMap[client.clientType] || 'Other';
                }
                
                const fullPlanName = `${clientCategory} - ${planName}`;
                planCounts[fullPlanName] = (planCounts[fullPlanName] || 0) + 1;
            } catch (e) {
                console.warn("Could not parse proposal content:", e);
            }
        }
    });

    const planDistribution = Object.entries(planCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const now = new Date();
    const proposalFunnelData = Array.from({ length: 6 }).map((_, i) => {
        const date = subMonths(now, 5 - i);
        const monthName = format(date, 'MMM');
        const monthStart = startOfMonth(date);
        
        const cumulativeSent = sentProposals.filter(p => new Date(p.createdAt) <= endOfMonth(date)).length;
        const cumulativeAccepted = acceptedProposals.filter(p => new Date(p.createdAt) <= endOfMonth(date)).length;
        
        return { month: monthName, sent: cumulativeSent, accepted: cumulativeAccepted };
    });

    const proposalCountsByRep = proposals.reduce((acc, proposal) => {
        acc[proposal.userId] = (acc[proposal.userId] || 0) + 1;
        return acc;
    }, {} as { [key: string]: number });

    const proposalsByRep = Object.entries(proposalCountsByRep).map(([userId, count]) => {
        const user = salesUsers.find(u => u.id === userId);
        return {
            userId: userId,
            name: user?.displayName || 'Unknown',
            proposals: count
        };
    }).sort((a, b) => b.proposals - a.proposals);


    return { totalRevenue, activeClients, salesReps, winRate, pendingClients, totalProposals, proposalPerClient, planDistribution, clientStatusDistribution, clientStatusChartData, proposalFunnelData, proposalsByRep };
  }, [proposals, clients, salesUsers, proposalsLoading, clientsLoading, usersLoading]);

  const isLoading = proposalsLoading || clientsLoading || usersLoading || commissionsLoading;

  if (isLoading) {
    return <AdminDashboardSkeleton />;
  }
  
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="flex flex-col gap-8">
       <Tabs defaultValue="crm" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold whitespace-nowrap">Dashboard</h1>
              <TabsList className="gap-1">
                <TabsTrigger value="crm"><UsersRound className="mr-2 h-4 w-4"/>CRM</TabsTrigger>
                <TabsTrigger value="sales-team"><Users className="mr-2 h-4 w-4"/>Sales Team</TabsTrigger>
                <TabsTrigger value="payroll"><CreditCard className="mr-2 h-4 w-4"/>Payroll</TabsTrigger>
              </TabsList>
            </div>
             <p className="text-muted-foreground text-sm">
                Organization-wide overview
            </p>
        </div>

        <TabsContent value="crm" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.activeClients}</div>
                    <p className="text-xs text-muted-foreground">Currently subscribed clients</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Clients</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.pendingClients}</div>
                    <p className="text-xs text-muted-foreground">Awaiting activation</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalProposals}</div>
                    <p className="text-xs text-muted-foreground">Proposals created across all clients</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Proposals per Client</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.proposalPerClient.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Average proposals per client</p>
                  </CardContent>
                </Card>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Client Status</CardTitle>
                        <CardDescription>Breakdown of clients by their current status.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.clientStatusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    outerRadius={80}
                                    dataKey="value"
                                >
                                    {stats.clientStatusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [value, name]} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Client Pipeline</CardTitle>
                        <CardDescription>Number of clients in each stage.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                       <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.clientStatusChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} />
                          <Bar dataKey="value" name="Clients" radius={[4, 4, 0, 0]}>
                            {stats.clientStatusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
            <div className="flex flex-col gap-6">
                <ClientDataTable clients={clients} users={salesUsers} proposals={proposals} />
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 />
                            Plan Distribution
                        </CardTitle>
                        <CardDescription>
                            Popularity of subscribed plans across all active clients.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.planDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                layout="vertical"
                                data={stats.planDistribution}
                                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis 
                                    type="category" 
                                    dataKey="name" 
                                    width={200}
                                    tick={{ fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                    contentStyle={{ backgroundColor: 'hsl(var(--background))' }}
                                />
                                <Bar dataKey="count" name="Subscriptions" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                                No subscription data available.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
        <TabsContent value="sales-team" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sales Team</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.salesReps} Reps</div>
                    <p className="text-xs text-muted-foreground">Total sales representatives</p>
                  </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Proposal Funnel Over Time</CardTitle>
                        <CardDescription>Cumulative proposals sent vs. accepted over the last 6 months.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.proposalFunnelData}>
                                <defs>
                                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                                    </linearGradient>
                                    <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} />
                                <Legend />
                                <Area type="monotone" dataKey="sent" stroke="hsl(var(--chart-2))" fill="url(#colorSent)" />
                                <Area type="monotone" dataKey="accepted" stroke="hsl(var(--chart-1))" fill="url(#colorAccepted)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Proposals By Sales Rep</CardTitle>
                        <CardDescription>Total proposals created by each team member.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] pr-6">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.proposalsByRep} margin={{ top: 20, right: 0, left: 0, bottom: 20 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="userId" 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tick={<CustomXAxisTick salesUsers={salesUsers} />}
                                    interval={0}
                                />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                    contentStyle={{ 
                                        backgroundColor: 'hsl(var(--background))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: 'var(--radius)'
                                    }}
                                    labelFormatter={(value) => {
                                        const user = salesUsers.find(u => u.id === value);
                                        return user ? user.displayName : 'Unknown';
                                    }}
                                />
                                <Bar dataKey="proposals" fill="hsl(var(--primary))" radius={4} barSize={20} label={<CustomBarLabel />} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
            <SalesTeamLeaderboard users={salesUsers} proposals={proposals} />
        </TabsContent>
        <TabsContent value="payroll" className="mt-6 space-y-6">
             <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{currencyFormatter.format(stats.totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">From all accepted proposals</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">Based on all sent proposals</p>
                  </CardContent>
                </Card>
            </div>
            <CommissionPayoutsTable commissions={commissions} users={salesUsers} clients={clients} proposals={proposals} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

    

    