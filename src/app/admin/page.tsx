'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileText, Users, CircleDollarSign, TrendingUp, Percent } from 'lucide-react';
import { useAllProposals } from '@/hooks/use-all-proposals';
import { useAllClients } from '@/hooks/use-all-clients';
import { useSalesUsers } from '@/hooks/use-sales-users';
import { Skeleton } from '@/components/ui/skeleton';

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
        <Skeleton className="h-4 w-64 mt-1" />
      </CardHeader>
      <CardContent className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
        <Skeleton className="h-8 w-56" />
      </CardContent>
    </Card>
  </div>
);


export default function AdminPage() {
  const { proposals, isLoading: proposalsLoading } = useAllProposals();
  const { clients, isLoading: clientsLoading } = useAllClients();
  const { salesUsers, isLoading: usersLoading } = useSalesUsers();
  const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

  const stats = useMemo(() => {
    if (proposalsLoading || clientsLoading || usersLoading) {
      return { totalRevenue: 0, activeClients: 0, salesReps: 0, winRate: 0 };
    }

    const acceptedProposals = proposals.filter(p => p.status === 'accepted');
    const totalRevenue = acceptedProposals.reduce((sum, p) => sum + p.amount, 0);

    const activeClients = clients.filter(c => c.status === 'active').length;
    const salesReps = salesUsers.length;

    const sentProposalsCount = proposals.filter(p => p.status === 'sent' || p.status === 'accepted' || p.status === 'rejected' || p.status === 'finalized').length;
    const winRate = sentProposalsCount > 0 ? (acceptedProposals.length / sentProposalsCount) * 100 : 0;

    return { totalRevenue, activeClients, salesReps, winRate };
  }, [proposals, clients, salesUsers, proposalsLoading, clientsLoading, usersLoading]);

  if (proposalsLoading || clientsLoading || usersLoading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Organization-wide overview of sales, clients, and team performance.
        </p>
      </div>

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
            <CardTitle className="text-sm font-medium">Sales Team</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.salesReps} Reps</div>
            <p className="text-xs text-muted-foreground">Total sales representatives</p>
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
      
       <Card>
        <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
                More charts and detailed tables will be added here to monitor team performance and client data.
            </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Charts and Leaderboards Placeholder</p>
        </CardContent>
      </Card>
    </div>
  );
}
