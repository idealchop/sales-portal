import { Response } from "express";
import { logger } from "firebase-functions";
import type { AuthenticatedRequest } from "../middleware/auth-middleware";
import { listCatalogCollectionDocuments, deleteCatalogCollectionDocument } from "../services/admin-catalog-collection-service";
import {
  deactivateCatalogDocument,
  listCatalogDocumentAudit,
  publishCatalogDocument,
  saveCatalogDocument,
} from "../services/catalog-lifecycle-service";
import { isVersionedCatalogCollection } from "../utils/catalog-publication";

function actorFromRequest(req: AuthenticatedRequest) {
  return {
    uid: req.user?.uid || "",
    email: req.user?.email,
    role: req.user?.role,
  };
}

export const getCatalogCollection = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const collectionId = String(req.params.collectionId || "");
  try {
    const documents = await listCatalogCollectionDocuments(collectionId);
    res.json({ data: { documents } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "INVALID_COLLECTION") {
      res.status(400).json({ error: "Unknown catalog collection." });
      return;
    }
    logger.error("Failed to list catalog collection documents", {
      error,
      collectionId,
    });
    res.status(500).json({ error: "Failed to load catalog documents." });
  }
};

export const putCatalogCollectionDocument = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const collectionId = String(req.params.collectionId || "");
  const body = req.body as {
    documentId?: string;
    data?: Record<string, unknown>;
    mode?: "draft" | "direct";
  };

  if (!body.documentId || typeof body.documentId !== "string") {
    res.status(400).json({ error: "Document id is required." });
    return;
  }
  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    res.status(400).json({ error: "Document data object is required." });
    return;
  }
  if (!req.user?.uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const document = await saveCatalogDocument({
      collectionId,
      documentId: body.documentId,
      data: body.data,
      actor: actorFromRequest(req),
      mode: body.mode,
    });
    res.json({ data: { document } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "INVALID_COLLECTION") {
      res.status(400).json({ error: "Unknown catalog collection." });
      return;
    }
    if (message === "DOCUMENT_ID_REQUIRED" || message === "INVALID_DOCUMENT_ID") {
      res.status(400).json({ error: "Invalid document id." });
      return;
    }
    logger.error("Failed to save catalog document", {
      error,
      collectionId,
      documentId: body.documentId,
    });
    res.status(500).json({ error: "Failed to save document." });
  }
};

export const postPublishCatalogDocument = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const collectionId = String(req.params.collectionId || "");
  const body = req.body as { documentId?: string; effectiveAt?: string | null };
  if (!body.documentId) {
    res.status(400).json({ error: "Document id is required." });
    return;
  }
  if (!req.user?.uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const document = await publishCatalogDocument({
      collectionId,
      documentId: body.documentId,
      actor: actorFromRequest(req),
      effectiveAt: body.effectiveAt,
    });
    res.json({ data: { document } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "DOCUMENT_NOT_FOUND") {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    if (message === "LAST_FREE_PLAN") {
      res.status(400).json({
        error: "Cannot deactivate the last Free plan. Stations need a fallback.",
      });
      return;
    }
    if (message === "NOT_VERSIONED") {
      res.status(400).json({ error: "This catalog is saved immediately." });
      return;
    }
    logger.error("Failed to publish catalog document", { error, collectionId });
    res.status(500).json({ error: "Failed to publish document." });
  }
};

export const postDeactivateCatalogDocument = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const collectionId = String(req.params.collectionId || "");
  const body = req.body as { documentId?: string };
  if (!body.documentId) {
    res.status(400).json({ error: "Document id is required." });
    return;
  }
  if (!req.user?.uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const document = await deactivateCatalogDocument({
      collectionId,
      documentId: body.documentId,
      actor: actorFromRequest(req),
    });
    res.json({ data: { document } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "DOCUMENT_NOT_FOUND") {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    if (message === "LAST_FREE_PLAN") {
      res.status(400).json({
        error: "Cannot deactivate the last Free plan. Stations need a fallback.",
      });
      return;
    }
    logger.error("Failed to deactivate catalog document", { error, collectionId });
    res.status(500).json({ error: "Failed to deactivate document." });
  }
};

export const getCatalogDocumentAudit = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const collectionId = String(req.params.collectionId || "");
  const documentId = String(req.query.documentId || "");
  try {
    const entries = await listCatalogDocumentAudit(collectionId, documentId);
    res.json({ data: { entries } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "INVALID_COLLECTION" || message === "DOCUMENT_ID_REQUIRED") {
      res.status(400).json({ error: "Invalid catalog document." });
      return;
    }
    logger.error("Failed to list catalog audit", { error, collectionId });
    res.status(500).json({ error: "Failed to load audit log." });
  }
};

export const deleteCatalogCollectionDocumentHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const collectionId = String(req.params.collectionId || "");
  const body = req.body as { documentId?: string };
  if (!body.documentId) {
    res.status(400).json({ error: "Document id is required." });
    return;
  }
  if (isVersionedCatalogCollection(collectionId)) {
    res.status(400).json({
      error: "Deactivate this catalog item instead of deleting it.",
    });
    return;
  }
  try {
    await deleteCatalogCollectionDocument(collectionId, body.documentId);
    res.json({
      data: { deleted: true, path: `${collectionId}/${body.documentId}` },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "DOCUMENT_NOT_FOUND") {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    logger.error("Failed to delete catalog document", { error, collectionId });
    res.status(500).json({ error: "Failed to delete document." });
  }
};
