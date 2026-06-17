import { apiClient } from "@/lib/api-client";
import { getSalesPortalApiUrl } from "@/lib/bff-url";
import type { Client, Commission, Proposal } from "@/lib/definitions";

export type SalesMaterial = {
  id: string;
  title: string;
  description?: string;
  type: "pdf" | "image" | "link" | "video";
  url: string;
  imageId?: string;
};

export type TeamMemberSummary = {
  id: string;
  displayName: string;
  email?: string;
  team?: string;
  role?: string;
  proposalsCount: number;
  commissionsTotal: number;
  pendingCommissions: number;
};

export type PublicProposalView = {
  proposal: Proposal;
  client: Client;
};

export async function fetchProposals() {
  const res = await apiClient.get<{ data: Proposal[] }>("/proposals");
  return res.data;
}

export async function fetchClients() {
  const res = await apiClient.get<{ data: Client[] }>("/clients");
  return res.data;
}

export async function fetchCommissions() {
  const res = await apiClient.get<{ data: Commission[] }>("/commissions");
  return res.data;
}

export async function fetchSalesTeam() {
  const res = await apiClient.get<{ data: TeamMemberSummary[] }>("/sales/team");
  return res.data;
}

export async function fetchSalesMaterials() {
  const res = await apiClient.get<{ data: SalesMaterial[] }>("/sales-materials");
  return res.data;
}

export async function createClient(input: Partial<Client>) {
  const res = await apiClient.post<{ data: Client }>("/clients", input);
  return res.data;
}

export async function createProposal(input: {
  clientId: string;
  title?: string;
  content?: string;
  amount?: number;
  status?: Proposal["status"];
  planId?: string;
  planName?: string;
}) {
  const res = await apiClient.post<{ data: Proposal }>("/proposals", input);
  return res.data;
}

export async function shareProposal(proposalId: string) {
  const res = await apiClient.post<{
    data: { linkId: string; proposalId: string; clientId: string };
  }>(`/proposals/${proposalId}/share`);
  return res.data;
}

export async function fetchPublicProposal(linkId: string) {
  const res = await fetch(`${getSalesPortalApiUrl()}/public/proposals/${linkId}`);
  if (!res.ok) throw new Error("Proposal not found");
  const json = (await res.json()) as { data: PublicProposalView };
  return json.data;
}

export async function createSalesMaterial(input: {
  title: string;
  description?: string;
  type?: SalesMaterial["type"];
  url: string;
  imageId?: string;
}) {
  const res = await apiClient.post<{ data: SalesMaterial }>("/sales-materials", input);
  return res.data;
}

export async function updateSalesMaterial(
  materialId: string,
  input: {
    title: string;
    description?: string;
    type?: SalesMaterial["type"];
    url: string;
    imageId?: string;
  },
) {
  const res = await apiClient.patch<{ data: SalesMaterial }>(
    `/sales-materials/${materialId}`,
    input,
  );
  return res.data;
}

export async function deleteSalesMaterial(materialId: string) {
  await apiClient.delete(`/sales-materials/${materialId}`);
}

export const PROPOSAL_PLANS = [
  { id: "household", name: "SmartRefill Individual", amount: 499 },
  { id: "sme", name: "Water Refill SME", amount: 1499 },
  { id: "commercial", name: "Water Refill Business", amount: 2999 },
  { id: "corporate", name: "Water Refill Enterprise", amount: 4999 },
  { id: "enterprise", name: "Water Refill Flow", amount: 7999 },
] as const;
