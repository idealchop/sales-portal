import { apiClient } from "@/lib/api-client";
import { getSalesPortalApiUrl } from "@/lib/bff-url";
import type {
  Client,
  ClientDirectoryEntry,
  Commission,
  Lead,
  LeadAnalytics,
  LeadEmailBlastQuota,
  LeadEmailBlastResult,
  LeadEmailTemplate,
  LeadEmailTemplateVisibility,
  LeadHistoryEvent,
  LeadQueue,
  LeadStage,
  OutreachRecipient,
  Proposal,
} from "@/lib/definitions";

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

export async function fetchClientDirectory() {
  const res = await apiClient.get<{ data: ClientDirectoryEntry[] }>(
    "/clients/directory",
  );
  return res.data;
}

export async function fetchOutreachRecipients() {
  const res = await apiClient.get<{ data: OutreachRecipient[] }>(
    "/outreach/recipients",
  );
  return res.data;
}

export type OutreachSendKind =
  | "new_user_registration"
  | "demo_inquiry"
  | "inactive_owner"
  | "generic"
  | "personalized";

export async function sendSalesOutreachEmail(input: {
  toEmail: string;
  kind?: OutreachSendKind;
  recipientName?: string;
  businessName?: string;
  subtitle?: string;
  subject?: string;
  bodyText?: string;
  leadId?: string;
  senderEmail?: string;
  senderName?: string;
}) {
  const res = await apiClient.post<{
    data: {
      outreach: {
        sent: boolean;
        skipped: boolean;
        messageId?: string;
        subject: string;
      };
    };
  }>("/outreach/send", input);
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

export async function fetchLeadAssignees() {
  const res = await apiClient.get<{ data: TeamMemberSummary[] }>(
    "/leads/assignees",
  );
  return res.data;
}

export async function fetchSalesMaterials() {
  const res = await apiClient.get<{ data: SalesMaterial[] }>("/sales-materials");
  return res.data;
}

export async function createClient(
  input: Partial<Client> & { linkedUserId?: string; appIds?: string[] },
) {
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

export type LeadListParams = {
  queue?: LeadQueue;
  stage?: LeadStage;
  assignee?: string;
  q?: string;
};

export async function fetchLeads(params: LeadListParams = {}) {
  const search = new URLSearchParams();
  if (params.queue && params.queue !== "all") search.set("queue", params.queue);
  if (params.stage) search.set("stage", params.stage);
  if (params.assignee) search.set("assignee", params.assignee);
  if (params.q) search.set("q", params.q);
  const query = search.toString();
  const res = await apiClient.get<{ data: Lead[] }>(
    `/leads${query ? `?${query}` : ""}`,
  );
  return res.data;
}

export async function fetchLeadsAnalytics() {
  const res = await apiClient.get<{ data: LeadAnalytics }>("/leads/analytics");
  return res.data;
}

export type GatherLeadsMode = "incremental" | "full";

export type GatherLeadsSummary = {
  mode: GatherLeadsMode;
  scanned: number;
  inserted: number;
  updated: number;
  skipped: number;
};

export async function gatherLeads(input: { mode: GatherLeadsMode }) {
  const res = await apiClient.post<{ data: GatherLeadsSummary }>(
    "/leads/gather",
    input,
  );
  return res.data;
}

export async function createLead(input: Partial<Lead>) {
  const res = await apiClient.post<{ data: Lead }>("/leads", input);
  return res.data;
}

export async function updateLead(
  leadId: string,
  input: Partial<Lead> & { bumpAttempt?: boolean },
) {
  const res = await apiClient.patch<{ data: Lead }>(`/leads/${leadId}`, input);
  return res.data;
}

export type BulkAssignMode = "set" | "add" | "remove" | "clear";

export async function bulkAssignLeads(input: {
  leadIds: string[];
  mode: BulkAssignMode;
  assignedToUids?: string[];
}) {
  const res = await apiClient.post<{
    data: {
      updated: Lead[];
      failed: Array<{ leadId: string; error: string }>;
    };
  }>("/leads/bulk-assign", input);
  return res.data;
}

export async function fetchLeadEmailTemplates() {
  const res = await apiClient.get<{ data: LeadEmailTemplate[] }>(
    "/leads/email-templates",
  );
  return res.data;
}

export async function createLeadEmailTemplate(input: {
  title: string;
  subject: string;
  bodyText: string;
  visibility: LeadEmailTemplateVisibility;
}) {
  const res = await apiClient.post<{ data: LeadEmailTemplate }>(
    "/leads/email-templates",
    input,
  );
  return res.data;
}

export async function updateLeadEmailTemplate(
  templateId: string,
  input: {
    title: string;
    subject: string;
    bodyText: string;
    visibility: LeadEmailTemplateVisibility;
  },
) {
  const res = await apiClient.patch<{ data: LeadEmailTemplate }>(
    `/leads/email-templates/${templateId}`,
    input,
  );
  return res.data;
}

export async function deleteLeadEmailTemplate(templateId: string) {
  await apiClient.delete(`/leads/email-templates/${templateId}`);
}

export async function fetchLeadEmailBlastQuota() {
  const res = await apiClient.get<{ data: LeadEmailBlastQuota }>(
    "/leads/email-blast/quota",
  );
  return res.data;
}

export async function sendLeadEmailBlast(input: {
  leadIds: string[];
  subject: string;
  bodyText: string;
  countAsAttempt?: boolean;
  senderEmail?: string;
  senderName?: string;
  templateId?: string;
}) {
  const res = await apiClient.post<{ data: LeadEmailBlastResult }>(
    "/leads/email-blast",
    input,
  );
  return res.data;
}

export async function fetchLeadHistory(leadId: string) {
  const res = await apiClient.get<{ data: LeadHistoryEvent[] }>(
    `/leads/${leadId}/history`,
  );
  return res.data;
}

export const PROPOSAL_PLANS = [
  { id: "household", name: "SmartRefill Individual", amount: 499 },
  { id: "sme", name: "Water Refill SME", amount: 1499 },
  { id: "commercial", name: "Water Refill Business", amount: 2999 },
  { id: "corporate", name: "Water Refill Enterprise", amount: 4999 },
  { id: "enterprise", name: "Water Refill Flow", amount: 7999 },
] as const;
