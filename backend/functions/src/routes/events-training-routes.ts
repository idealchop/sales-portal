import express from "express";
import {
  deleteBlogHandler,
  deleteScheduleHandler,
  deleteVideoHandler,
  deleteWebinarHandler,
  getAnalyticsHandler,
  getBlogCommentsHandler,
  getBlogsHandler,
  getCertificationsHandler,
  getModerationInboxHandler,
  getRegistrationsHandler,
  getSchedulesHandler,
  getTutorialAppsHandler,
  getVideoCommentsHandler,
  getVideoQuestionsHandler,
  getVideosHandler,
  getWebinarRegistrationsHandler,
  getWebinarsHandler,
  patchBlogCommentHandler,
  deleteBlogCommentHandler,
  patchBlogHandler,
  patchScheduleHandler,
  patchVideoCommentHandler,
  deleteVideoCommentHandler,
  patchVideoHandler,
  patchVideoQuestionHandler,
  deleteVideoQuestionHandler,
  patchWebinarHandler,
  postAcceptRegistrationHandler,
  postBlogHandler,
  postFormatBlogBodyHandler,
  postCertificatePreviewHandler,
  postCertificationHandler,
  putWebinarCertificateTemplateHandler,
  postDeclineRegistrationHandler,
  deleteRegistrationHandler,
  postRegistrationAttendanceHandler,
  postRevokeCertificationHandler,
  postScheduleHandler,
  postSchedulePreviewHandler,
  getWebinarAutomationHandler,
  postWebinarAutomationInstallHandler,
  putWebinarAutomationEnabledHandler,
  postWebinarAutomationPreviewHandler,
  postUploadHandler,
  postVideoHandler,
  postWebinarHandler,
} from "../handlers/events-training-handler";
import {
  requireSalesPortalAccess,
  validateFirebaseIdToken,
} from "../middleware/auth-middleware";
import { requireManagerOrAdminRole } from "../middleware/require-admin";

const router = express.Router();

/** Resources CMS + ops: blogs, videos, webinars, registrations, schedules, moderation, certs, analytics. */
router.use(
  validateFirebaseIdToken,
  requireSalesPortalAccess,
  requireManagerOrAdminRole,
);

router.get("/webinars", getWebinarsHandler);
router.post("/webinars", postWebinarHandler);
router.patch("/webinars/:webinarId", patchWebinarHandler);
router.delete("/webinars/:webinarId", deleteWebinarHandler);
router.get("/webinars/:webinarId/registrations", getWebinarRegistrationsHandler);

router.get("/videos", getVideosHandler);
router.get("/apps", getTutorialAppsHandler);
router.post("/videos", postVideoHandler);
router.patch("/videos/:videoId", patchVideoHandler);
router.delete("/videos/:videoId", deleteVideoHandler);
router.get("/videos/:videoId/comments", getVideoCommentsHandler);
router.patch("/videos/:videoId/comments/:commentId", patchVideoCommentHandler);
router.delete("/videos/:videoId/comments/:commentId", deleteVideoCommentHandler);
router.get("/videos/:videoId/questions", getVideoQuestionsHandler);
router.patch("/videos/:videoId/questions/:questionId", patchVideoQuestionHandler);
router.delete(
  "/videos/:videoId/questions/:questionId",
  deleteVideoQuestionHandler,
);

router.get("/blogs", getBlogsHandler);
router.post("/blogs", postBlogHandler);
router.post("/blogs/format-html", postFormatBlogBodyHandler);
router.patch("/blogs/:blogId", patchBlogHandler);
router.delete("/blogs/:blogId", deleteBlogHandler);
router.get("/blogs/:blogId/comments", getBlogCommentsHandler);
router.patch("/blogs/:blogId/comments/:commentId", patchBlogCommentHandler);
router.delete("/blogs/:blogId/comments/:commentId", deleteBlogCommentHandler);

router.get("/registrations", getRegistrationsHandler);
router.post("/registrations/:registrationId/accept", postAcceptRegistrationHandler);
router.post("/registrations/:registrationId/decline", postDeclineRegistrationHandler);
router.delete("/registrations/:registrationId", deleteRegistrationHandler);
router.post(
  "/registrations/:registrationId/attendance",
  postRegistrationAttendanceHandler,
);

router.get("/moderation/inbox", getModerationInboxHandler);

router.get("/schedules", getSchedulesHandler);
router.post("/schedules/preview", postSchedulePreviewHandler);
router.post("/schedules", postScheduleHandler);
router.patch("/schedules/:scheduleId", patchScheduleHandler);
router.delete("/schedules/:scheduleId", deleteScheduleHandler);

router.get("/webinars/:webinarId/automation", getWebinarAutomationHandler);
router.post(
  "/webinars/:webinarId/automation/install",
  postWebinarAutomationInstallHandler,
);
router.put(
  "/webinars/:webinarId/automation",
  putWebinarAutomationEnabledHandler,
);
router.post(
  "/webinars/:webinarId/automation/preview",
  postWebinarAutomationPreviewHandler,
);

router.get("/certifications", getCertificationsHandler);
router.post("/certifications/preview", postCertificatePreviewHandler);
router.post("/certifications", postCertificationHandler);
router.post("/certifications/:certId/revoke", postRevokeCertificationHandler);
router.put(
  "/webinars/:webinarId/certificate-template",
  putWebinarCertificateTemplateHandler,
);

router.get("/analytics", getAnalyticsHandler);

router.post("/upload", postUploadHandler);

export default router;
