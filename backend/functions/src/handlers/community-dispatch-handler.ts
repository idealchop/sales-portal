import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import {
  assignCommunityDispatchRequest,
  cancelCommunityDispatchRequest,
  getCommunityDispatchRequestDetail,
  listCommunityDispatchRequests,
} from "../services/community-dispatch-ops-service";
import { notifyCommunityDispatchOfferViaSmartrefill } from "../services/notify-community-dispatch-offer";
import { logger } from "firebase-functions";

const OPS_ROLES = new Set(["admin", "manager"]);

function requireOpsRole(req: AuthenticatedRequest, res: Response): boolean {
  const role = req.user?.role;
  if (!role || !OPS_ROLES.has(role)) {
    res.status(403).json({ error: "Only managers and admins can manage community dispatch." });
    return false;
  }
  return true;
}

export async function getCommunityDispatchRequests(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!requireOpsRole(req, res)) return;

  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const limit =
      typeof req.query.limit === "string" ? Number.parseInt(req.query.limit, 10) : undefined;
    const rows = await listCommunityDispatchRequests({ status, limit });
    res.json({ data: rows });
  } catch (error) {
    logger.error("getCommunityDispatchRequests failed", { error });
    res.status(500).json({ error: "Failed to load dispatch requests." });
  }
}

export async function getCommunityDispatchRequestById(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!requireOpsRole(req, res)) return;

  try {
    const detail = await getCommunityDispatchRequestDetail(req.params.requestId);
    if (!detail) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    res.json({ data: detail });
  } catch (error) {
    logger.error("getCommunityDispatchRequestById failed", { error });
    res.status(500).json({ error: "Failed to load dispatch request." });
  }
}

export async function postCancelCommunityDispatchRequest(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!requireOpsRole(req, res)) return;

  try {
    const result = await cancelCommunityDispatchRequest(
      req.params.requestId,
      req.user?.uid ?? "ops",
    );
    if (!result.ok) {
      const status = result.code === "NOT_FOUND" ? 404 : 409;
      res.status(status).json({ error: result.code });
      return;
    }
    res.json({ data: { ok: true } });
  } catch (error) {
    logger.error("postCancelCommunityDispatchRequest failed", { error });
    res.status(500).json({ error: "Failed to cancel request." });
  }
}

export async function postAssignCommunityDispatchRequest(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!requireOpsRole(req, res)) return;

  const body = (req.body ?? {}) as { businessId?: string };
  const businessId = body.businessId?.trim();
  if (!businessId) {
    res.status(400).json({ error: "businessId is required." });
    return;
  }

  try {
    const result = await assignCommunityDispatchRequest({
      requestId: req.params.requestId,
      businessId,
      actorUid: req.user?.uid ?? "ops",
    });
    if (!result.ok) {
      const status =
        result.code === "NOT_FOUND" || result.code === "BUSINESS_NOT_FOUND" ? 404 : 409;
      res.status(status).json({ error: result.code });
      return;
    }

    const idToken = req.headers.authorization?.split("Bearer ")[1]?.trim();
    if (idToken) {
      void notifyCommunityDispatchOfferViaSmartrefill(idToken, {
        offerId: result.offerId,
        requestId: req.params.requestId,
        businessId,
      }).catch((error) => {
        logger.warn("postAssignCommunityDispatchRequest notify failed", { error });
      });
    }

    res.json({ data: { ok: true, offerId: result.offerId } });
  } catch (error) {
    logger.error("postAssignCommunityDispatchRequest failed", { error });
    res.status(500).json({ error: "Failed to assign request." });
  }
}
