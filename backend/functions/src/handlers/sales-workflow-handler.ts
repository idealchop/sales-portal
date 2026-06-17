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
  getClient,
  listClients,
  updateClient,
} from "../services/clients-service";
import { listCommissions } from "../services/commissions-service";
import { getManagerTeamSummary } from "../services/sales-team-service";
import {
  assertAdmin,
  createSalesMaterial,
  deleteSalesMaterial,
  listSalesMaterials,
  updateSalesMaterial,
} from "../services/sales-materials-service";

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
    case "MATERIAL_FIELDS_REQUIRED":
    case "INVALID_STATUS":
    case "INVALID_TYPE":
      res.status(400).json({ error: code });
      return;
    case "CLIENT_NOT_FOUND":
      res.status(404).json({ error: "Client not found." });
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
