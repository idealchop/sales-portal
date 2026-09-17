import express from "express";
import {
  deleteSalesMaterialHandler,
  getClientDirectoryHandler,
  getClientsHandler,
  getCommissionsHandler,
  getLeadAssigneesHandler,
  getLeadHandler,
  getLeadHistoryHandler,
  getLeadsAnalyticsHandler,
  getLeadsHandler,
  getOutreachRecipientsHandler,
  getProposalHandler,
  getProposalsHandler,
  getPublicProposalHandler,
  getSalesMaterialsHandler,
  getSalesTeamHandler,
  patchClientHandler,
  patchLeadHandler,
  patchProposalHandler,
  patchSalesMaterialHandler,
  postClientHandler,
  postLeadHandler,
  postLeadsGatherHandler,
  postProposalHandler,
  postProposalShareHandler,
  postSalesOutreachSendHandler,
  postSalesMaterialHandler,
} from "../handlers/sales-workflow-handler";
import { postBrevoTransactionalWebhookHandler } from "../handlers/brevo-webhook-handler";
import {
  requireSalesPortalAccess,
  validateFirebaseIdToken,
} from "../middleware/auth-middleware";

const router = express.Router();

router.get("/public/proposals/:linkId", getPublicProposalHandler);
router.post(
  "/webhooks/brevo/transactional",
  postBrevoTransactionalWebhookHandler,
);

router.use(validateFirebaseIdToken, requireSalesPortalAccess);

router.get("/proposals", getProposalsHandler);
router.post("/proposals", postProposalHandler);
router.get("/proposals/:proposalId", getProposalHandler);
router.patch("/proposals/:proposalId", patchProposalHandler);
router.post("/proposals/:proposalId/share", postProposalShareHandler);

router.get("/clients", getClientsHandler);
router.get("/clients/directory", getClientDirectoryHandler);
router.get("/outreach/recipients", getOutreachRecipientsHandler);
router.post("/outreach/send", postSalesOutreachSendHandler);
router.post("/clients", postClientHandler);
router.patch("/clients/:clientId", patchClientHandler);

router.get("/leads/analytics", getLeadsAnalyticsHandler);
router.get("/leads/assignees", getLeadAssigneesHandler);
router.post("/leads/gather", postLeadsGatherHandler);
router.get("/leads", getLeadsHandler);
router.post("/leads", postLeadHandler);
router.get("/leads/:leadId/history", getLeadHistoryHandler);
router.get("/leads/:leadId", getLeadHandler);
router.patch("/leads/:leadId", patchLeadHandler);

router.get("/commissions", getCommissionsHandler);
router.get("/sales/team", getSalesTeamHandler);

router.get("/sales-materials", getSalesMaterialsHandler);
router.post("/sales-materials", postSalesMaterialHandler);
router.patch("/sales-materials/:materialId", patchSalesMaterialHandler);
router.delete("/sales-materials/:materialId", deleteSalesMaterialHandler);

export default router;
