import {
  endOfQuarter,
  format,
  isValid,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfQuarter,
  subMonths,
} from "date-fns";
import type { Client, MonthlyPayout, Proposal, WithId } from "@/lib/definitions";

function getValidDate(timestamp: string | undefined): Date | null {
  if (!timestamp) return null;
  try {
    const date = parseISO(timestamp);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

export function computeDashboardData(input: {
  proposals: WithId<Proposal>[];
  clients: WithId<Client>[];
  allPayouts: MonthlyPayout[];
}) {
  const { proposals, clients, allPayouts } = input;
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const currentMonthKey = format(startOfMonth(now), "MMMM yyyy");
  const currentMonthPayout = allPayouts.find((p) => p.month === currentMonthKey);
  const oneTimeCommissionsThisMonth =
    currentMonthPayout?.commissions.filter(
      (c) => c.type === "commission" && c.description !== "Recurring commission",
    ) || [];
  const monthlyCommission = oneTimeCommissionsThisMonth.reduce(
    (sum, p) => sum + p.amount,
    0,
  );

  const lastMonthKey = format(startOfMonth(subMonths(now, 1)), "MMMM yyyy");
  const lastMonthPayout = allPayouts.find((p) => p.month === lastMonthKey);
  const lastMonthOneTimeCommission =
    lastMonthPayout?.commissions
      .filter(
        (c) =>
          c.type === "commission" && c.description !== "Recurring commission",
      )
      .reduce((sum, p) => sum + p.amount, 0) || 0;

  const commissionChange =
    lastMonthOneTimeCommission > 0
      ? ((monthlyCommission - lastMonthOneTimeCommission) /
          lastMonthOneTimeCommission) *
        100
      : monthlyCommission > 0
        ? 100
        : 0;

  const acceptedProposals = proposals.filter((p) => p.status === "accepted");
  const recurringRates: Record<string, number> = {
    household: 0,
    sme: 0.03,
    commercial: 0.03,
    corporate: 0.03,
    enterprise: 0.03,
  };

  const activeRecurringCommissions = acceptedProposals
    .map((proposal) => {
      const client = clientMap.get(proposal.clientId);
      if (!client?.clientType) return null;
      const rate = recurringRates[client.clientType] || 0;
      if (!rate) return null;
      const startDate = getValidDate(proposal.createdAt);
      if (!startDate) return null;
      const monthDiff =
        (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth());
      if (monthDiff < 0 || monthDiff >= 12) return null;
      return {
        id: `${proposal.id}-recurring-${monthDiff}`,
        clientName: client.companyName,
        description: "Recurring commission",
        amount: proposal.amount * rate,
        progress: `${monthDiff + 1}/12`,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    clientName: string;
    description: string;
    amount: number;
    progress: string;
  }>;

  const recurringCommission = activeRecurringCommissions.reduce(
    (sum, c) => sum + c.amount,
    0,
  );

  const acceptedThisMonth = acceptedProposals.filter((p) => {
    const createdAt = getValidDate(p.createdAt);
    return (
      createdAt &&
      isWithinInterval(createdAt, { start: currentMonthStart, end: now })
    );
  });

  const corporateClientsThisMonth = acceptedThisMonth.filter((p) => {
    const client = clientMap.get(p.clientId);
    return (
      client &&
      ["sme", "commercial", "corporate", "enterprise"].includes(
        client.clientType || "",
      )
    );
  });

  const individualClientsThisMonth = acceptedThisMonth.filter((p) => {
    const client = clientMap.get(p.clientId);
    return client?.clientType === "household";
  });

  const quarterStart = startOfQuarter(now);
  const quarterEnd = endOfQuarter(now);
  const quarterlySalesVolume = acceptedProposals
    .filter((p) => {
      const proposalDate = getValidDate(p.createdAt);
      return (
        proposalDate &&
        isWithinInterval(proposalDate, { start: quarterStart, end: quarterEnd })
      );
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const commissionHistory = allPayouts
    .slice(0, 6)
    .map((payout) => ({
      month: format(new Date(payout.month), "MMM"),
      revenue: payout.totalAmount,
    }))
    .reverse();

  const proposalsSent = proposals.filter((p) => p.status !== "draft").length;
  const winRate =
    proposalsSent > 0 ? (acceptedProposals.length / proposalsSent) * 100 : 0;
  const totalSalesValue = acceptedProposals.reduce(
    (sum, p) => sum + p.amount,
    0,
  );
  const avgDealSize =
    acceptedProposals.length > 0
      ? totalSalesValue / acceptedProposals.length
      : 0;

  const activityData = [
    { name: "Sent", value: proposalsSent, fill: "#3b82f6" },
    { name: "Accepted", value: acceptedProposals.length, fill: "#36a69f" },
  ];

  const prepaidContractsDetails = acceptedProposals
    .map((proposal) => {
      try {
        if (!proposal.content) return null;
        const content = JSON.parse(proposal.content) as {
          billingCycleLabel?: string;
        };
        if (
          content.billingCycleLabel &&
          ["Semi-Annually", "Annually"].includes(content.billingCycleLabel)
        ) {
          const client = clientMap.get(proposal.clientId);
          return {
            clientName: client?.companyName || "Unknown Client",
            term: content.billingCycleLabel,
          };
        }
        return null;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Array<{ clientName: string; term: string }>;

  return {
    monthlyCommission,
    commissionChange,
    recurringCommission,
    activeRecurringCommissions,
    oneTimeCommissionsThisMonth,
    corporateClientsThisMonth: corporateClientsThisMonth.length,
    individualClientsThisMonth: individualClientsThisMonth.length,
    corporateClientsTarget: 5,
    individualClientsTarget: 10,
    quarterlySalesVolume,
    quarterlyVolumeTarget: 200000,
    commissionHistory,
    proposalsSent,
    winRate,
    avgDealSize,
    activityData,
    prepaidContracts: prepaidContractsDetails.length,
    prepaidContractsTarget: 3,
    prepaidContractsDetails,
  };
}
