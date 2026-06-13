import { Response } from "express";
import { logger } from "firebase-functions";
import type { AuthenticatedRequest } from "../middleware/auth-middleware";
import {
  createAdminUser,
  deleteAdminUser,
  deleteAdminUsers,
  listAdminUsers,
  updateAdminUserAppAccess,
  type AdminAppAccessEntry,
} from "../services/admin-user-service";
import { listDataManagementOverview } from "../services/admin-data-management-service";
import {
  deleteBusinessFirestoreDocument,
  deleteBusinessFirestoreTree,
  listBusinessFirestoreDocuments,
  listBusinessTransactions,
  listCustomerTransactions,
  listCustomerInventoryAssignments,
  updateBusinessFirestoreDocument,
} from "../services/admin-business-documents-service";
import {
  deleteUserFirestoreDocument,
  deleteUserFirestoreProfile,
  listUserFirestoreDocuments,
  updateUserFirestoreDocument,
} from "../services/admin-user-documents-service";
import {
  deleteCatalogCollectionDocument,
  listCatalogCollectionDocuments,
  upsertCatalogCollectionDocument,
} from "../services/admin-catalog-collection-service";

export const getAdminUsers = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const users = await listAdminUsers();
    res.json({ data: { users } });
  } catch (error) {
    logger.error("Failed to list admin users", { error });
    res.status(500).json({ error: "Failed to load users." });
  }
};

export const getAdminDataManagement = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const overview = await listDataManagementOverview();
    res.json({ data: overview });
  } catch (error) {
    logger.error("Failed to load admin data management overview", { error });
    res.status(500).json({ error: "Failed to load data management." });
  }
};

export const postAdminUser = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const body = req.body as {
    email?: string;
    displayName?: string;
    password?: string;
  };

  try {
    const user = await createAdminUser({
      email: String(body.email || ""),
      displayName: String(body.displayName || ""),
      password: String(body.password || ""),
    });
    res.status(201).json({ data: { user } });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error ?
        String((error as { code?: string }).code || "") :
        "";
    const message = error instanceof Error ? error.message : String(error);
    if (message === "EMAIL_AND_NAME_REQUIRED") {
      res.status(400).json({ error: "Email and display name are required." });
      return;
    }
    if (message === "PASSWORD_TOO_SHORT") {
      res.status(400).json({ error: "Password must be at least 8 characters." });
      return;
    }
    if (code === "auth/email-already-exists" || message.includes("email-already-exists")) {
      res.status(409).json({ error: "A user with this email already exists." });
      return;
    }
    logger.error("Failed to create admin user", { error });
    res.status(500).json({ error: "Failed to create user." });
  }
};

export const patchAdminUserAppAccess = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const uid = String(req.params.uid || "");
  const body = req.body as { appAccess?: AdminAppAccessEntry[] };

  if (!uid) {
    res.status(400).json({ error: "User id is required." });
    return;
  }
  if (!Array.isArray(body.appAccess)) {
    res.status(400).json({ error: "appAccess array is required." });
    return;
  }

  try {
    const user = await updateAdminUserAppAccess(uid, body.appAccess);
    res.json({ data: { user } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "USER_NOT_FOUND") {
      res.status(404).json({ error: "User not found." });
      return;
    }
    if (message.startsWith("Invalid") || message.startsWith("SmartRefill")) {
      res.status(400).json({ error: message });
      return;
    }
    logger.error("Failed to update user app access", { error, uid });
    res.status(500).json({ error: "Failed to update permissions." });
  }
};

export const deleteAdminUserHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const uid = String(req.params.uid || "");
  const actorUid = req.user?.uid;

  if (!uid) {
    res.status(400).json({ error: "User id is required." });
    return;
  }
  if (!actorUid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const result = await deleteAdminUser(uid, actorUid);
    res.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CANNOT_DELETE_SELF") {
      res.status(400).json({ error: "You cannot delete your own account." });
      return;
    }
    if (message === "USER_NOT_FOUND") {
      res.status(404).json({ error: "User not found." });
      return;
    }
    logger.error("Failed to delete admin user", { error, uid });
    res.status(500).json({ error: "Failed to delete user." });
  }
};

export const deleteAdminUsersBulk = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const body = req.body as { uids?: string[] };
  const actorUid = req.user?.uid;

  if (!actorUid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!Array.isArray(body.uids) || body.uids.length === 0) {
    res.status(400).json({ error: "uids array is required." });
    return;
  }

  try {
    const result = await deleteAdminUsers(body.uids, actorUid);
    res.json({ data: result });
  } catch (error) {
    logger.error("Failed to bulk delete admin users", { error });
    res.status(500).json({ error: "Failed to delete users." });
  }
};

export const getAdminUserDocuments = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const uid = String(req.params.uid || "");
  if (!uid) {
    res.status(400).json({ error: "User id is required." });
    return;
  }

  try {
    const documents = await listUserFirestoreDocuments(uid);
    res.json({ data: { documents } });
  } catch (error) {
    logger.error("Failed to list user Firestore documents", { error, uid });
    res.status(500).json({ error: "Failed to load user documents." });
  }
};

export const getAdminBusinessDocuments = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const businessId = String(req.params.businessId || "");
  if (!businessId) {
    res.status(400).json({ error: "Business id is required." });
    return;
  }

  try {
    const documents = await listBusinessFirestoreDocuments(businessId);
    res.json({ data: { documents } });
  } catch (error) {
    logger.error("Failed to list business Firestore documents", {
      error,
      businessId,
    });
    res.status(500).json({ error: "Failed to load business documents." });
  }
};

export const getAdminBusinessTransactions = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const businessId = String(req.params.businessId || "");
  const typesParam = String(req.query.types || "");

  if (!businessId) {
    res.status(400).json({ error: "Business id is required." });
    return;
  }

  const types = typesParam
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (types.length === 0) {
    res.status(400).json({ error: "At least one transaction type is required." });
    return;
  }

  try {
    const documents = await listBusinessTransactions(businessId, types);
    res.json({ data: { documents } });
  } catch (error) {
    logger.error("Failed to list business transactions", {
      error,
      businessId,
      types,
    });
    res.status(500).json({ error: "Failed to load business transactions." });
  }
};

export const getAdminCustomerTransactions = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const businessId = String(req.params.businessId || "");
  const customerId = String(req.params.customerId || "");

  if (!businessId) {
    res.status(400).json({ error: "Business id is required." });
    return;
  }
  if (!customerId) {
    res.status(400).json({ error: "Customer id is required." });
    return;
  }

  try {
    const documents = await listCustomerTransactions(businessId, customerId);
    res.json({ data: { documents } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CUSTOMER_NOT_FOUND") {
      res.status(404).json({ error: "Customer not found." });
      return;
    }
    logger.error("Failed to list customer transactions", {
      error,
      businessId,
      customerId,
    });
    res.status(500).json({ error: "Failed to load customer transactions." });
  }
};

export const getAdminCustomerInventoryAssignments = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const businessId = String(req.params.businessId || "");
  const customerId = String(req.params.customerId || "");

  if (!businessId) {
    res.status(400).json({ error: "Business id is required." });
    return;
  }
  if (!customerId) {
    res.status(400).json({ error: "Customer id is required." });
    return;
  }

  try {
    const documents = await listCustomerInventoryAssignments(
      businessId,
      customerId,
    );
    res.json({ data: { documents } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CUSTOMER_NOT_FOUND") {
      res.status(404).json({ error: "Customer not found." });
      return;
    }
    logger.error("Failed to list customer inventory assignments", {
      error,
      businessId,
      customerId,
    });
    res.status(500).json({
      error: "Failed to load customer inventory assignments.",
    });
  }
};

export const putAdminBusinessDocument = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const businessId = String(req.params.businessId || "");
  const body = req.body as { path?: string; data?: Record<string, unknown> };

  if (!businessId) {
    res.status(400).json({ error: "Business id is required." });
    return;
  }
  if (!body.path || typeof body.path !== "string") {
    res.status(400).json({ error: "Document path is required." });
    return;
  }
  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    res.status(400).json({ error: "Document data object is required." });
    return;
  }

  try {
    const document = await updateBusinessFirestoreDocument(
      businessId,
      body.path,
      body.data,
    );
    res.json({ data: { document } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "INVALID_DOCUMENT_PATH") {
      res.status(400).json({ error: "Invalid document path for this business." });
      return;
    }
    logger.error("Failed to update business Firestore document", {
      error,
      businessId,
    });
    res.status(500).json({ error: "Failed to update document." });
  }
};

export const deleteAdminBusinessDocument = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const businessId = String(req.params.businessId || "");
  const body = req.body as { path?: string };

  if (!businessId) {
    res.status(400).json({ error: "Business id is required." });
    return;
  }
  if (!body.path || typeof body.path !== "string") {
    res.status(400).json({ error: "Document path is required." });
    return;
  }

  try {
    await deleteBusinessFirestoreDocument(businessId, body.path);
    res.json({ data: { deleted: true, path: body.path } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "INVALID_DOCUMENT_PATH") {
      res.status(400).json({ error: "Invalid document path for this business." });
      return;
    }
    if (message === "CANNOT_DELETE_ROOT_BUSINESS_DOC") {
      res.status(400).json({
        error: "The root business document cannot be deleted. Edit it instead.",
      });
      return;
    }
    if (message === "DOCUMENT_NOT_FOUND") {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    logger.error("Failed to delete business Firestore document", {
      error,
      businessId,
    });
    res.status(500).json({ error: "Failed to delete document." });
  }
};

export const deleteAdminBusinessFirestoreTree = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const businessId = String(req.params.businessId || "");
  if (!businessId) {
    res.status(400).json({ error: "Business id is required." });
    return;
  }

  try {
    const result = await deleteBusinessFirestoreTree(businessId);
    res.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "BUSINESS_NOT_FOUND") {
      res.status(404).json({ error: "No Firestore business documents found." });
      return;
    }
    logger.error("Failed to delete business Firestore tree", { error, businessId });
    res.status(500).json({ error: "Failed to delete business workspace." });
  }
};

export const putAdminUserDocument = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const uid = String(req.params.uid || "");
  const body = req.body as { path?: string; data?: Record<string, unknown> };

  if (!uid) {
    res.status(400).json({ error: "User id is required." });
    return;
  }
  if (!body.path || typeof body.path !== "string") {
    res.status(400).json({ error: "Document path is required." });
    return;
  }
  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    res.status(400).json({ error: "Document data object is required." });
    return;
  }

  try {
    const document = await updateUserFirestoreDocument(uid, body.path, body.data);
    res.json({ data: { document } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "INVALID_DOCUMENT_PATH") {
      res.status(400).json({ error: "Invalid document path for this user." });
      return;
    }
    logger.error("Failed to update user Firestore document", { error, uid });
    res.status(500).json({ error: "Failed to update document." });
  }
};

export const deleteAdminUserDocument = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const uid = String(req.params.uid || "");
  const body = req.body as { path?: string };

  if (!uid) {
    res.status(400).json({ error: "User id is required." });
    return;
  }
  if (!body.path || typeof body.path !== "string") {
    res.status(400).json({ error: "Document path is required." });
    return;
  }

  try {
    await deleteUserFirestoreDocument(uid, body.path);
    res.json({ data: { deleted: true, path: body.path } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "INVALID_DOCUMENT_PATH") {
      res.status(400).json({ error: "Invalid document path for this user." });
      return;
    }
    if (message === "CANNOT_DELETE_ROOT_USER_DOC") {
      res.status(400).json({
        error: "The root users document cannot be deleted. Edit it instead.",
      });
      return;
    }
    if (message === "DOCUMENT_NOT_FOUND") {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    logger.error("Failed to delete user Firestore document", { error, uid });
    res.status(500).json({ error: "Failed to delete document." });
  }
};

export const deleteAdminUserFirestoreProfile = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const uid = String(req.params.uid || "");
  if (!uid) {
    res.status(400).json({ error: "User id is required." });
    return;
  }

  try {
    const result = await deleteUserFirestoreProfile(uid);
    res.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "USER_PROFILE_NOT_FOUND") {
      res.status(404).json({ error: "No Firestore user documents found." });
      return;
    }
    logger.error("Failed to delete user Firestore profile", { error, uid });
    res.status(500).json({ error: "Failed to remove user collection." });
  }
};

export const getAdminCatalogCollection = async (
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

export const putAdminCatalogCollectionDocument = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const collectionId = String(req.params.collectionId || "");
  const body = req.body as {
    documentId?: string;
    data?: Record<string, unknown>;
  };

  if (!body.documentId || typeof body.documentId !== "string") {
    res.status(400).json({ error: "Document id is required." });
    return;
  }
  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    res.status(400).json({ error: "Document data object is required." });
    return;
  }

  try {
    const document = await upsertCatalogCollectionDocument(
      collectionId,
      body.documentId,
      body.data,
    );
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
    logger.error("Failed to upsert catalog collection document", {
      error,
      collectionId,
      documentId: body.documentId,
    });
    res.status(500).json({ error: "Failed to save document." });
  }
};

export const deleteAdminCatalogCollectionDocument = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const collectionId = String(req.params.collectionId || "");
  const body = req.body as { documentId?: string };

  if (!body.documentId || typeof body.documentId !== "string") {
    res.status(400).json({ error: "Document id is required." });
    return;
  }

  try {
    await deleteCatalogCollectionDocument(collectionId, body.documentId);
    res.json({
      data: {
        deleted: true,
        path: `${collectionId}/${body.documentId}`,
      },
    });
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
    if (message === "DOCUMENT_NOT_FOUND") {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    logger.error("Failed to delete catalog collection document", {
      error,
      collectionId,
      documentId: body.documentId,
    });
    res.status(500).json({ error: "Failed to delete document." });
  }
};
