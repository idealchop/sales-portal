import express from "express";
import {
  deleteAdminBusinessDocument,
  deleteAdminBusinessFirestoreTree,
  deleteAdminUserDocument,
  deleteAdminUserFirestoreProfile,
  deleteAdminUserHandler,
  deleteAdminUsersBulk,
  deleteAdminCatalogCollectionDocument,
  getAdminBusinessDocuments,
  getAdminBusinessTransactions,
  getAdminCustomerTransactions,
  getAdminCustomerInventoryAssignments,
  getAdminCatalogCollection,
  patchAdminCustomerBulkStatus,
  putAdminBusinessDocument,
  getAdminDataManagement,
  getAdminUserDocuments,
  getAdminUsers,
  patchAdminUserAppAccess,
  postRevokeAdminUserAccess,
  postAdminUser,
  putAdminUserDocument,
  putAdminCatalogCollectionDocument,
} from "../handlers/admin-handler";
import {
  requireSalesPortalAccess,
  validateFirebaseIdToken,
} from "../middleware/auth-middleware";
import { requireAdminRole } from "../middleware/require-admin";

const router = express.Router();

router.use(validateFirebaseIdToken, requireSalesPortalAccess, requireAdminRole);

router.get("/users", getAdminUsers);
router.get("/data-management", getAdminDataManagement);
router.get("/catalog-collections/:collectionId", getAdminCatalogCollection);
router.put(
  "/catalog-collections/:collectionId/documents",
  putAdminCatalogCollectionDocument,
);
router.delete(
  "/catalog-collections/:collectionId/documents",
  deleteAdminCatalogCollectionDocument,
);
router.get("/businesses/:businessId/documents", getAdminBusinessDocuments);
router.get("/businesses/:businessId/transactions", getAdminBusinessTransactions);
router.get(
  "/businesses/:businessId/customers/:customerId/transactions",
  getAdminCustomerTransactions,
);
router.get(
  "/businesses/:businessId/customers/:customerId/inventory-assignments",
  getAdminCustomerInventoryAssignments,
);
router.patch(
  "/businesses/:businessId/customers/bulk-status",
  patchAdminCustomerBulkStatus,
);
router.put("/businesses/:businessId/documents", putAdminBusinessDocument);
router.delete("/businesses/:businessId/documents", deleteAdminBusinessDocument);
router.delete(
  "/businesses/:businessId/firestore-tree",
  deleteAdminBusinessFirestoreTree,
);
router.post("/users", postAdminUser);
router.post("/users/bulk-delete", deleteAdminUsersBulk);
router.post("/users/:uid/revoke-access", postRevokeAdminUserAccess);
router.patch("/users/:uid/app-access", patchAdminUserAppAccess);
router.get("/users/:uid/documents", getAdminUserDocuments);
router.put("/users/:uid/documents", putAdminUserDocument);
router.delete("/users/:uid/documents", deleteAdminUserDocument);
router.delete("/users/:uid/firestore-profile", deleteAdminUserFirestoreProfile);
router.delete("/users/:uid", deleteAdminUserHandler);

export default router;
