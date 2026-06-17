import { listClients } from "./clients-service";
import { listCommissions } from "./commissions-service";
import { computeProposalPipeline } from "./compute-sales-insights";
import { listProposals } from "./proposals-service";
import type { SalesActor } from "./sales-scope";

export type PersonalSalesSummary = {
  totalProposals: number;
  totalClients: number;
  pipelineValue: number;
  acceptedValue: number;
  winRate: number;
  commissionsMtd: number;
  pendingCommissions: number;
  paidCommissionsMtd: number;
  draftsNeedingAction: number;
  sentAwaitingResponse: number;
};

export async function buildPersonalSalesSummary(
  actor: SalesActor,
): Promise<PersonalSalesSummary> {
  const [proposals, commissions, clients] = await Promise.all([
    listProposals(actor),
    listCommissions(actor),
    listClients(actor),
  ]);

  const pipeline = computeProposalPipeline({ proposals, clients });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const mtdCommissions = commissions.filter((row) => {
    if (!row.createdAt) return false;
    const created = new Date(row.createdAt);
    return !Number.isNaN(created.getTime()) && created >= monthStart;
  });

  const commissionsMtd = mtdCommissions.reduce((sum, row) => sum + row.amount, 0);
  const paidCommissionsMtd = mtdCommissions
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + row.amount, 0);
  const pendingCommissions = commissions
    .filter((row) => row.status === "pending")
    .reduce((sum, row) => sum + row.amount, 0);

  const draftsNeedingAction = proposals.filter(
    (row) => row.status === "draft",
  ).length;
  const sentAwaitingResponse = proposals.filter(
    (row) => row.status === "sent",
  ).length;

  return {
    totalProposals: pipeline.totalProposals,
    totalClients: pipeline.totalClients,
    pipelineValue: pipeline.pipelineValue,
    acceptedValue: pipeline.acceptedValue,
    winRate: pipeline.winRate,
    commissionsMtd,
    pendingCommissions,
    paidCommissionsMtd,
    draftsNeedingAction,
    sentAwaitingResponse,
  };
}
