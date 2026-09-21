import { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth-middleware";
import type { SalesPortalRole } from "../services/sales-portal-access";
import {
  createProposal,
  createProposalShareLink,
  getProposal,
  getPublicProposalByLink,
  listProposals,
  updateProposal,
} from "../services/proposals-service";
import {
  createClient,
  listClientDirectory,
  listClients,
  updateClient,
} from "../services/clients-service";
import { listOutreachRecipients } from "../services/outreach-recipients-service";
import { postOutreachSendHandler } from "./outreach-send-handler";
import { listCommissions } from "../services/commissions-service";
import { getManagerTeamSummary, listLeadAssignees } from "../services/sales-team-service";
import {
  assertAdmin,
  createSalesMaterial,
  deleteSalesMaterial,
  listSalesMaterials,
  updateSalesMaterial,
} from "../services/sales-materials-service";
import {
  createLead,
  getLead,
  getLeadsAnalytics,
  listLeadHistory,
  listLeads,
  updateLead,
  bulkAssignLeads,
  type LeadQueue,
  type LeadStage,
} from "../services/leads-service";
import {
  createLeadEmailTemplate,
  deleteLeadEmailTemplate,
  listLeadEmailTemplates,
  updateLeadEmailTemplate,
} from "../services/lead-email-templates-service";
import {
  getLeadEmailBlastQuota,
  sendLeadEmailBlast,
} from "../services/lead-email-blast-service";
import {
  gatherLeadsFromSources,
  type GatherMode,
} from "../services/gather-leads-service";

function actorFromRequest(req: AuthenticatedRequest) {
  const uid = req.user?.uid;
  const role = req.user?.role as SalesPortalRole | undefined;
  if (!uid || !role) return null;
  return { uid, role };
}

function mapServiceError(res: Response, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL";
  switch (code) {
  case "NOT_FOUND":
    res.status(404).json({ error: "Resource not found." });
    return;
  case "FORBIDDEN":
  case "CLIENT_FORBIDDEN":
    res.status(403).json({ error: "You do not have access to this resource." });
    return;
  case "CLIENT_ID_REQUIRED":
  case "CLIENT_FIELDS_REQUIRED":
  case "LEAD_FIELDS_REQUIRED":
  case "MATERIAL_FIELDS_REQUIRED":
  case "INVALID_STATUS":
  case "INVALID_TYPE":
  case "INVALID_STAGE":
  case "INVALID_DEMO":
  case "INVALID_SOURCE_KIND":
  case "INVALID_DATA_IMPORTED":
  case "INVALID_TRAINING_PHASE":
  case "INVALID_DATE":
  case "INVALID_BULK_ASSIGN_MODE":
  case "LEAD_IDS_REQUIRED":
  case "TOO_MANY_LEAD_IDS":
  case "ASSIGNEES_REQUIRED":
  case "TEMPLATE_FIELDS_REQUIRED":
  case "BLAST_FIELDS_REQUIRED":
  case "TOO_MANY_BLAST_RECIPIENTS":
  case "DAILY_BLAST_LIMIT_REACHED":
  case "DAILY_BLAST_LIMIT_EXCEEDED":
    res.status(400).json({ error: code });
    return;
  case "CLIENT_NOT_FOUND":
    res.status(404).json({ error: "Client not found." });
    return;
  case "LINKED_USER_NOT_FOUND":
    res.status(404).json({ error: "Linked user not found." });
    return;
  case "LINKED_BUSINESS_NOT_FOUND":
    res.status(404).json({ error: "Linked business not found." });
    return;
  default:
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export const getProposalsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await listProposals(actor);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const getProposalHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await getProposal(actor, req.params.proposalId);
    if (!data) {
      res.status(404).json({ error: "Proposal not found." });
      return;
    }
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const postProposalHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await createProposal(actor, req.body);
    res.status(201).json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const patchProposalHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await updateProposal(actor, req.params.proposalId, req.body);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const postProposalShareHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await createProposalShareLink(actor, req.params.proposalId);
    res.status(201).json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const getPublicProposalHandler = async (req: Request, res: Response) => {
  try {
    const data = await getPublicProposalByLink(req.params.linkId);
    if (!data) {
      res.status(404).json({ error: "Proposal link not found." });
      return;
    }
    res.json({ data });
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getClientsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await listClients(actor);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const getClientDirectoryHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await listClientDirectory(actor);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const getOutreachRecipientsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await listOutreachRecipients(actor);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const postSalesOutreachSendHandler = postOutreachSendHandler;

export const postClientHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await createClient(actor, req.body);
    res.status(201).json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const patchClientHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await updateClient(actor, req.params.clientId, req.body);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const getCommissionsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await listCommissions(actor);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const getLeadAssigneesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await listLeadAssignees(actor);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const getSalesTeamHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await getManagerTeamSummary(actor);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const getSalesMaterialsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await listSalesMaterials();
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const postSalesMaterialHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    assertAdmin(actor);
    const data = await createSalesMaterial(req.body);
    res.status(201).json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const patchSalesMaterialHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    assertAdmin(actor);
    const data = await updateSalesMaterial(req.params.materialId, req.body);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const deleteSalesMaterialHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    assertAdmin(actor);
    await deleteSalesMaterial(req.params.materialId);
    res.json({ success: true });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const getLeadsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const queue = typeof req.query.queue === "string" ?
      (req.query.queue as LeadQueue) :
      undefined;
    const stage = typeof req.query.stage === "string" ?
      (req.query.stage as LeadStage) :
      undefined;
    const assignee =
      typeof req.query.assignee === "string" ? req.query.assignee : undefined;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const data = await listLeads(actor, { queue, stage, assignee, q });
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const getLeadsAnalyticsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await getLeadsAnalytics(actor);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const getLeadHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await getLead(actor, req.params.leadId);
    if (!data) {
      res.status(404).json({ error: "Lead not found." });
      return;
    }
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const postLeadsGatherHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const rawMode =
      typeof req.body?.mode === "string" ? req.body.mode.trim() : "incremental";
    if (rawMode !== "incremental" && rawMode !== "full") {
      res.status(400).json({
        error: "mode must be \"incremental\" or \"full\".",
      });
      return;
    }
    const mode = rawMode as GatherMode;
    const data = await gatherLeadsFromSources(mode);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const postLeadHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await createLead(actor, req.body);
    res.status(201).json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const patchLeadHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await updateLead(actor, req.params.leadId, req.body);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const postLeadsBulkAssignHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await bulkAssignLeads(actor, {
      leadIds: req.body?.leadIds,
      mode: req.body?.mode,
      assignedToUids: req.body?.assignedToUids,
    });
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const getLeadHistoryHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const data = await listLeadHistory(actor, req.params.leadId);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const getLeadEmailTemplatesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = await listLeadEmailTemplates(actor);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const postLeadEmailTemplateHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = await createLeadEmailTemplate(actor, req.body);
    res.status(201).json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const patchLeadEmailTemplateHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = await updateLeadEmailTemplate(
      actor,
      req.params.templateId,
      req.body,
    );
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const deleteLeadEmailTemplateHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    await deleteLeadEmailTemplate(actor, req.params.templateId);
    res.status(204).send();
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const getLeadEmailBlastQuotaHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = await getLeadEmailBlastQuota(actor);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};

export const postLeadEmailBlastHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = await sendLeadEmailBlast(actor, {
      leadIds: req.body?.leadIds,
      subject: req.body?.subject,
      bodyText: req.body?.bodyText,
      countAsAttempt: Boolean(req.body?.countAsAttempt),
      senderEmail: req.body?.senderEmail,
      senderName: req.body?.senderName,
      templateId: req.body?.templateId,
    });
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
};
