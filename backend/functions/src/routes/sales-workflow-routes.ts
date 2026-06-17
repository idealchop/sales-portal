import express from "express";
import {
  deleteSalesMaterialHandler,
  getClientsHandler,
  getCommissionsHandler,
  getProposalHandler,
  getProposalsHandler,
  getPublicProposalHandler,
  getSalesMaterialsHandler,
  getSalesTeamHandler,
  patchClientHandler,
  patchProposalHandler,
  patchSalesMaterialHandler,
  postClientHandler,
  postProposalHandler,
  postProposalShareHandler,
  postSalesMaterialHandler,
} from "../handlers/sales-workflow-handler";
import {
  requireSalesPortalAccess,
  validateFirebaseIdToken,
} from "../middleware/auth-middleware";

const router = express.Router();

router.get("/public/proposals/:linkId", getPublicProposalHandler);

router.use(validateFirebaseIdToken, requireSalesPortalAccess);

router.get("/proposals", getProposalsHandler);
router.post("/proposals", postProposalHandler);
router.get("/proposals/:proposalId", getProposalHandler);
router.patch("/proposals/:proposalId", patchProposalHandler);
router.post("/proposals/:proposalId/share", postProposalShareHandler);

router.get("/clients", getClientsHandler);
router.post("/clients", postClientHandler);
router.patch("/clients/:clientId", patchClientHandler);

router.get("/commissions", getCommissionsHandler);
router.get("/sales/team", getSalesTeamHandler);

router.get("/sales-materials", getSalesMaterialsHandler);
router.post("/sales-materials", postSalesMaterialHandler);
router.patch("/sales-materials/:materialId", patchSalesMaterialHandler);
router.delete("/sales-materials/:materialId", deleteSalesMaterialHandler);

export default router;
