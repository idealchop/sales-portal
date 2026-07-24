import { Response } from "express";
import { logger } from "firebase-functions";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import {
  clearLegacySmartRefillAnalyticsCache,
  fetchLegacySmartRefillAnalytics,
  fetchLegacySmartRefillStationDetail,
} from "../services/legacy-smartrefill-analytics-service";
import {
  contactLegacySmartRefillStation,
  deleteLegacySmartRefillStation,
  bulkContactLegacySmartRefillStations,
  bulkDeleteLegacySmartRefillStations,
  bulkIgnoreLegacySmartRefillStations,
  ignoreLegacySmartRefillStation,
  restoreLegacySmartRefillStation,
} from "../services/legacy-smartrefill-station-actions";

export async function getLegacySmartRefillAnalyticsHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const forceRefresh =
      String(req.query.refresh || "").trim() === "1" ||
      String(req.query.refresh || "").toLowerCase() === "true";

    const { data, computedAt } = await fetchLegacySmartRefillAnalytics({
      forceRefresh,
    });

    res.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate",
    );
    res.json({
      data,
      meta: { computedAt, sourceDatabase: data.sourceDatabase },
    });
  } catch (error) {
    logger.error("Failed to load legacy SmartRefill analytics", { error });
    res.status(500).json({
      error: "Failed to load SmartRefill (legacy) analytics.",
    });
  }
}

export async function getLegacySmartRefillStationDetailHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const stationId = String(req.params.stationId || "").trim();
    if (!stationId) {
      res.status(400).json({ error: "Station id is required." });
      return;
    }

    const offset = Number(req.query.offset || 0);
    const limit = Number(req.query.limit || 50);

    const data = await fetchLegacySmartRefillStationDetail({
      stationId,
      transactionOffset: Number.isFinite(offset) ? offset : 0,
      transactionLimit: Number.isFinite(limit) ? limit : 50,
    });

    if (!data) {
      res.status(404).json({ error: "Station not found in prod-smartrefill." });
      return;
    }

    res.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate",
    );
    res.json({ data });
  } catch (error) {
    logger.error("Failed to load legacy SmartRefill station detail", {
      error,
      stationId: req.params.stationId,
    });
    res.status(500).json({
      error: "Failed to load SmartRefill (legacy) station detail.",
    });
  }
}

export async function postLegacySmartRefillStationIgnoreHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const stationId = String(req.params.stationId || "").trim();
  if (!stationId) {
    res.status(400).json({ error: "Station id is required." });
    return;
  }

  try {
    const data = await ignoreLegacySmartRefillStation({
      stationId,
      actorUid: uid,
    });
    clearLegacySmartRefillAnalyticsCache();
    res.json({ data });
  } catch (error) {
    logger.error("Failed to ignore legacy SmartRefill station", {
      error,
      stationId,
    });
    res.status(500).json({ error: "Failed to ignore legacy station." });
  }
}

export async function postLegacySmartRefillStationContactHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const stationId = String(req.params.stationId || "").trim();
  if (!stationId) {
    res.status(400).json({ error: "Station id is required." });
    return;
  }

  try {
    const data = await contactLegacySmartRefillStation({
      stationId,
      actorUid: uid,
      toEmail: req.body?.toEmail,
      recipientName: req.body?.recipientName,
      businessName: req.body?.businessName,
    });
    clearLegacySmartRefillAnalyticsCache();
    res.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to contact legacy station.";
    if (message.includes("email is required")) {
      res.status(400).json({ error: message });
      return;
    }
    logger.error("Failed to contact legacy SmartRefill station", {
      error,
      stationId,
    });
    if (message.toLowerCase().includes("brevo") || message.includes("send")) {
      res.status(502).json({
        error:
          "Failed to send outreach email via Brevo. Contact was not recorded.",
      });
      return;
    }
    res.status(500).json({ error: "Failed to mark legacy station contacted." });
  }
}

export async function postLegacySmartRefillStationRestoreHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const stationId = String(req.params.stationId || "").trim();
  if (!stationId) {
    res.status(400).json({ error: "Station id is required." });
    return;
  }

  try {
    const data = await restoreLegacySmartRefillStation({
      stationId,
      actorUid: uid,
    });
    clearLegacySmartRefillAnalyticsCache();
    res.json({ data });
  } catch (error) {
    logger.error("Failed to restore legacy SmartRefill station to triage", {
      error,
      stationId,
    });
    res.status(500).json({ error: "Failed to restore legacy station to triage." });
  }
}

export async function deleteLegacySmartRefillStationHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const stationId = String(req.params.stationId || "").trim();
  if (!stationId) {
    res.status(400).json({ error: "Station id is required." });
    return;
  }

  try {
    const data = await deleteLegacySmartRefillStation({
      stationId,
      actorUid: uid,
    });
    clearLegacySmartRefillAnalyticsCache();
    logger.info("Deleted legacy SmartRefill station", {
      stationId,
      deleted: data.deleted,
      actorUid: uid,
    });
    res.json({ data });
  } catch (error) {
    logger.error("Failed to delete legacy SmartRefill station", {
      error,
      stationId,
    });
    res.status(500).json({
      error: "Failed to delete legacy station records from prod-smartrefill.",
    });
  }
}

export async function postLegacySmartRefillStationsBulkDeleteHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rawIds = Array.isArray(req.body?.stationIds) ? req.body.stationIds : [];
  const stationIds = rawIds
    .map((id: unknown) => String(id || "").trim())
    .filter(Boolean);

  if (stationIds.length === 0) {
    res.status(400).json({ error: "At least one station id is required." });
    return;
  }

  try {
    const data = await bulkDeleteLegacySmartRefillStations({
      stationIds,
      actorUid: uid,
    });
    clearLegacySmartRefillAnalyticsCache();
    logger.info("Bulk deleted legacy SmartRefill stations", {
      requested: stationIds.length,
      deleted: data.deletedIds.length,
      missing: data.missingIds.length,
      failed: data.failed.length,
      actorUid: uid,
    });
    res.json({ data });
  } catch (error) {
    logger.error("Failed to bulk delete legacy SmartRefill stations", {
      error,
    });
    res.status(500).json({
      error: "Failed to bulk delete legacy station records.",
    });
  }
}

export async function postLegacySmartRefillStationsBulkIgnoreHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rawIds = Array.isArray(req.body?.stationIds) ? req.body.stationIds : [];
  const stationIds = rawIds
    .map((id: unknown) => String(id || "").trim())
    .filter(Boolean);

  if (stationIds.length === 0) {
    res.status(400).json({ error: "At least one station id is required." });
    return;
  }

  try {
    const data = await bulkIgnoreLegacySmartRefillStations({
      stationIds,
      actorUid: uid,
    });
    clearLegacySmartRefillAnalyticsCache();
    res.json({ data });
  } catch (error) {
    logger.error("Failed to bulk ignore legacy SmartRefill stations", {
      error,
    });
    res.status(500).json({ error: "Failed to bulk ignore legacy stations." });
  }
}

export async function postLegacySmartRefillStationsBulkContactHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rawIds = Array.isArray(req.body?.stationIds) ? req.body.stationIds : [];
  const stationIds = rawIds
    .map((id: unknown) => String(id || "").trim())
    .filter(Boolean);

  if (stationIds.length === 0) {
    res.status(400).json({ error: "At least one station id is required." });
    return;
  }

  try {
    const data = await bulkContactLegacySmartRefillStations({
      stationIds,
      actorUid: uid,
    });
    clearLegacySmartRefillAnalyticsCache();
    res.json({ data });
  } catch (error) {
    logger.error("Failed to bulk contact legacy SmartRefill stations", {
      error,
    });
    res.status(500).json({ error: "Failed to bulk contact legacy stations." });
  }
}
