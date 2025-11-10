
'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileText, Users, CircleDollarSign, TrendingUp, Percent, ShieldCheck, CreditCard, UsersRound, Trophy, Award } from 'lucide-react';
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
        if (client.status !== 'active' || !client.onboardingStatus) return 0;
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
                            const salesRep = latestProposal ? userMap.get(latestProposal.userId) : null;
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
                                            <Badge variant="outline" className={cn("capitalize", clientStatusStyles[client.status])}>{client.status}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {client.status === 'active' && (
                                                <div className="flex items-center gap-2">
                                                    <Progress value={progress} className="w-24 h-2" />
                                                    <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                                                </div>
                                            )}
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

const CommissionPayoutsTable = ({ commissions, users, clients }: { commissions: WithId<Commission>[], users: WithId<UserProfile>[], clients: WithId<Client>[] }) => {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    
    // Create a map from proposalId to clientId
    const proposalClientMap = useMemo(() => {
        const map = new Map<string, string>();
        clients.forEach(client => {
            client.proposals?.forEach(proposal => {
                map.set(proposal.id, client.id);
            });
        });
        return map;
    }, [clients]);

    // Create clientMap for direct lookup
    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

    const getClientName = (commission: Commission) => {
        // Fallback logic
        if (commission.clientName) return commission.clientName;
        const clientId = proposalClientMap.get(commission.proposalId);
        return clientId ? clientMap.get(clientId)?.companyName : 'N/A';
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
                                        <Badge variant="outline" className={cn("capitalize", commissionStatusStyles[commission.status])}>
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


export default function AdminPage() {
  const { proposals, isLoading: proposalsLoading } = useAllProposals();
  const { clients, isLoading: clientsLoading } = useAllClients();
  const { salesUsers, isLoading: usersLoading } = useSalesUsers();
  const { commissions, isLoading: commissionsLoading } = useAllCommissions();
  const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

  const stats = useMemo(() => {
    if (proposalsLoading || clientsLoading || usersLoading) {
      return { totalRevenue: 0, activeClients: 0, salesReps: 0, winRate: 0 };
    }

    const acceptedProposals = proposals.filter(p => p.status === 'accepted');
    const totalRevenue = acceptedProposals.reduce((sum, p) => sum + p.amount, 0);

    const activeClients = clients.filter(c => c.status === 'active').length;
    const salesReps = salesUsers.length;

    const sentProposalsCount = proposals.filter(p => ['sent', 'accepted', 'rejected', 'finalized'].includes(p.status)).length;
    const winRate = sentProposalsCount > 0 ? (acceptedProposals.length / sentProposalsCount) * 100 : 0;

    return { totalRevenue, activeClients, salesReps, winRate };
  }, [proposals, clients, salesUsers, proposalsLoading, clientsLoading, usersLoading]);

  const isLoading = proposalsLoading || clientsLoading || usersLoading || commissionsLoading;

  if (isLoading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-8">
       <Tabs defaultValue="crm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold whitespace-nowrap">Dashboard</h1>
              <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex h-auto p-1.5 bg-muted rounded-full">
                <TabsTrigger value="crm" className="rounded-full gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <UsersRound /> CRM
                </TabsTrigger>
                <TabsTrigger value="sales-team" className="rounded-full gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Users /> Sales Team
                </TabsTrigger>
                <TabsTrigger value="payroll" className="rounded-full gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <CreditCard /> Payroll
                </TabsTrigger>
              </TabsList>
            </div>
             <p className="text-muted-foreground text-sm">
                Organization-wide overview
            </p>
        </div>

        <TabsContent value="crm" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
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
            </div>
            <ClientDataTable clients={clients} users={salesUsers} proposals={proposals} />
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
            <CommissionPayoutsTable commissions={commissions} users={salesUsers} clients={clients} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
