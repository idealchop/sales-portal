'use client';

import { useMemo } from 'react';
import { useUser } from '@/firebase';
import { useSalesUsers } from '@/hooks/use-sales-users';
import { useAllProposals } from '@/hooks/use-all-proposals';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Users, Trophy, Award } from 'lucide-react';
import type { UserProfile, Proposal } from '@/lib/definitions';
import { WithId } from '@/firebase';

export default function MyTeamPage() {
  const { user, isManager } = useUser();
  const { salesUsers, isLoading: usersLoading } = useSalesUsers();
  const { proposals, isLoading: proposalsLoading } = useAllProposals();
  const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

  const myTeam = useMemo(() => {
    if (!user || !isManager || usersLoading) return [];

    const managerTeamName = `${user.location} (${user.displayName})`;

    return salesUsers.filter(
      (salesUser) => salesUser.role === 'sales' && salesUser.team === managerTeamName
    );
  }, [user, isManager, salesUsers, usersLoading]);

  const teamPerformance = useMemo(() => {
    if (proposalsLoading || myTeam.length === 0) return [];

    const performanceData = myTeam.map((member) => {
      const userProposals = proposals.filter((p) => p.userId === member.id);
      const acceptedProposals = userProposals.filter((p) => p.status === 'accepted');
      const sentProposals = userProposals.filter((p) => ['sent', 'accepted', 'rejected', 'finalized'].includes(p.status));
      const totalRevenue = acceptedProposals.reduce((sum, p) => sum + p.amount, 0);
      const winRate = sentProposals.length > 0 ? (acceptedProposals.length / sentProposals.length) * 100 : 0;

      return {
        ...member,
        proposalsWon: acceptedProposals.length,
        totalRevenue,
        winRate,
      };
    });

    return performanceData.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [proposals, myTeam, proposalsLoading]);

  const isLoading = usersLoading || proposalsLoading;

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamPerformance.length > 0 ? (
                teamPerformance.map((rep, index) => {
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
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
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
