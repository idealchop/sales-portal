"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { firestore } from "@/lib/firebase/firestore";
import { toIsoString } from "@/lib/firestore-utils";
import type {
  Commission,
  MonthlyPayout,
  PayoutCommission,
  WithId,
} from "@/lib/definitions";
import { useAllClients } from "./use-all-clients";
import { useAllProposals } from "./use-all-proposals";
import { useAuthUid } from "./use-auth-uid";
import { useSalesProfile } from "./use-sales-profile";
import { useSalesUsers } from "./use-sales-users";

export function useCommissions(userId?: string) {
  const { authReady, uid: authUid } = useAuthUid();
  const { profile, isManager } = useSalesProfile();
  const { salesUsers, isLoading: isSalesUsersLoading } = useSalesUsers();
  const { proposals: allProposals, isLoading: proposalsLoading } =
    useAllProposals();
  const { clients: allClients, isLoading: clientsLoading } = useAllClients();
  const [commissions, setCommissions] = useState<WithId<Commission>[]>([]);

  const teamMemberIds = useMemo(() => {
    if (!isManager || !profile) return [];
    const managerTeamName = `${profile.location} (${profile.displayName})`;
    return salesUsers
      .filter((u) => u.team === managerTeamName)
      .map((u) => u.id);
  }, [isManager, profile, salesUsers]);

  const targetId = userId || profile?.id;
  const userIdsToQuery = useMemo(() => {
    if (isManager && !userId && targetId) {
      return [targetId, ...teamMemberIds];
    }
    if (targetId) {
      return [targetId];
    }
    return [];
  }, [isManager, targetId, teamMemberIds, userId]);
  const subscriptionKey = userIdsToQuery.slice(0, 30).join(",");
  const shouldSubscribe =
    authReady &&
    Boolean(authUid) &&
    Boolean(targetId) &&
    userIdsToQuery.length > 0;
  const [loadedForKey, setLoadedForKey] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldSubscribe) return;

    const q = query(
      collection(firestore, "commissions"),
      where("userId", "in", userIdsToQuery.slice(0, 30)),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCommissions(
          snap.docs.map((docSnap) => {
            const data = docSnap.data() as Omit<Commission, "id">;
            return {
              ...data,
              id: docSnap.id,
              createdAt: toIsoString(data.createdAt),
            };
          }),
        );
        setLoadedForKey(subscriptionKey);
      },
      () => {
        setCommissions([]);
        setLoadedForKey(subscriptionKey);
      },
    );
    return () => unsub();
  }, [shouldSubscribe, subscriptionKey, userIdsToQuery]);

  const commissionsLoading =
    shouldSubscribe ? loadedForKey !== subscriptionKey : false;

  const allPayouts = useMemo(() => {
    if (commissionsLoading || proposalsLoading || clientsLoading || isSalesUsersLoading) {
      return [];
    }

    const commissionsByMonth: Record<string, WithId<PayoutCommission>[]> = {};
    const clientMap = new Map(allClients.map((c) => [c.id, c]));

    commissions.forEach((commission) => {
      if (!commission.createdAt) return;
      const monthKey = format(
        startOfMonth(new Date(commission.createdAt)),
        "MMMM yyyy",
      );
      if (!commissionsByMonth[monthKey]) commissionsByMonth[monthKey] = [];
      const proposal = allProposals.find((p) => p.id === commission.proposalId);
      const clientName = proposal
        ? clientMap.get(proposal.clientId)?.companyName
        : undefined;
      commissionsByMonth[monthKey].push({ ...commission, clientName });
    });

    const userMap = new Map(salesUsers.map((u) => [u.id, u]));
    const recurringRates: Record<string, number> = {
      household: 0,
      sme: 0.03,
      commercial: 0.03,
      corporate: 0.03,
      enterprise: 0.03,
    };

    allProposals
      .filter((p) => p.status === "accepted" && p.createdAt)
      .forEach((proposal) => {
        const user = userMap.get(proposal.userId);
        const client = clientMap.get(proposal.clientId);
        if (!client?.clientType) return;

        const isQrSaleByManager =
          user?.role === "manager" &&
          proposal.userId === user.id &&
          !!proposal.sourceLocation;
        if (user?.role !== "sales" && !isQrSaleByManager) return;

        const rate = recurringRates[client.clientType] || 0;
        if (!rate) return;

        const startDate = parseISO(proposal.createdAt);
        const today = new Date();
        for (let i = 0; i < 12; i++) {
          const commissionMonthDate = addMonths(startDate, i);
          if (commissionMonthDate > today) break;
          const monthKey = format(commissionMonthDate, "MMMM yyyy");
          if (!commissionsByMonth[monthKey]) commissionsByMonth[monthKey] = [];
          const recurringId = `recurring-${proposal.id}-${i}`;
          if (
            !commissionsByMonth[monthKey].some(
              (c) => c.id === recurringId && c.userId === proposal.userId,
            )
          ) {
            commissionsByMonth[monthKey].push({
              id: recurringId,
              userId: proposal.userId,
              proposalId: proposal.id,
              amount: proposal.amount * rate,
              createdAt: commissionMonthDate.toISOString(),
              status: "pending",
              type: "commission",
              description: `Recurring (${i + 1}/12)${isQrSaleByManager ? " (QR Campaign)" : ""}`,
              clientName: client.companyName,
              referenceId: `recurring-${proposal.id}`,
            });
          }
        }
      });

    const targetUserId = userId || profile?.id;
    const userIdsToInclude =
      isManager && !userId ? [targetUserId, ...teamMemberIds] : [targetUserId];

    const processed: MonthlyPayout[] = [];
    Object.keys(commissionsByMonth).forEach((month) => {
      const userCommissions = commissionsByMonth[month].filter((c) =>
        userIdsToInclude.includes(c.userId),
      );
      if (!userCommissions.length) return;
      const totalAmount = userCommissions.reduce((sum, c) => sum + c.amount, 0);
      const allPaid = !userCommissions.some((c) => c.status === "pending");
      processed.push({
        month,
        totalAmount,
        status: allPaid ? "paid" : "pending",
        timelineStatus: allPaid ? "paid" : "calculated",
        commissions: userCommissions,
        transactionId: `SR-PO-${new Date(month).getFullYear()}${String(new Date(month).getMonth() + 1).padStart(2, "0")}-${(targetUserId || "USER").slice(0, 4).toUpperCase()}`,
      });
    });

    processed.sort(
      (a, b) => new Date(b.month).getTime() - new Date(a.month).getTime(),
    );
    return processed;
  }, [
    commissions,
    commissionsLoading,
    proposalsLoading,
    clientsLoading,
    isSalesUsersLoading,
    userId,
    profile?.id,
    isManager,
    teamMemberIds,
    allProposals,
    allClients,
    salesUsers,
  ]);

  return {
    allPayouts,
    commissions: shouldSubscribe ? commissions : [],
    isLoading:
      commissionsLoading ||
      proposalsLoading ||
      clientsLoading ||
      isSalesUsersLoading,
  };
}
