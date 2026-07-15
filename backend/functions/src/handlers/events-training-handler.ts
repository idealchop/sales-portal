import { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth-middleware";
import {
  clampPeriodDays,
  getEventsTrainingAnalytics,
} from "../services/events-training/analytics-service";
import {
  createWrsBlog,
  deleteWrsBlog,
  listWrsBlogs,
  updateWrsBlog,
} from "../services/events-training/blogs-service";
import { formatBlogBodyWithAi } from "../services/events-training/format-blog-body-service";
import {
  issueCertification,
  previewCertificateSvg,
  listCertifications,
  revokeCertification,
  setWebinarCertificateTemplate,
} from "../services/events-training/certifications-service";
import { uploadEventsTrainingImage } from "../services/events-training/events-training-upload-service";
import {
  answerQuestion,
  listBlogComments,
  listModerationInbox,
  listQuestions,
  listVideoComments,
  moderateComment,
  setQuestionStatus,
} from "../services/events-training/moderation-service";
import {
  acceptRegistration,
  declineRegistration,
  listRegistrations,
  setRegistrationAttendance,
} from "../services/events-training/registrations-service";
import {
  createSchedule,
  deleteSchedule,
  listSchedules,
  previewWebinarScheduleMessage,
  queueMetaCommunityPost,
  updateSchedule,
} from "../services/events-training/schedules-service";
import {
  createTrainingVideo,
  deleteTrainingVideo,
  listTrainingVideos,
  updateTrainingVideo,
} from "../services/events-training/videos-service";
import {
  getTutorialApp,
  listTutorialApps,
} from "../services/events-training/tutorial-apps-service";
import {
  createWebinar,
  deleteWebinar,
  listWebinars,
  updateWebinar,
} from "../services/events-training/webinars-service";
import { notifyWebinarPublishedViaSmartrefill } from "../services/notify-webinar-published";
import {
  getWebinarAutomationPlan,
  installWebinarPromotionAutomation,
  previewAutomationMilestone,
  setWebinarPromotionAutomationEnabled,
} from "../services/events-training/webinar-promotion-automation";
import { notifyTutorialPublishedViaSmartrefill } from "../services/notify-tutorial-published";
import { notifyResourcesVideoPublishedViaSmartrefill } from "../services/notify-resources-video-published";
import type {
  CommentStatus,
  ContentParentKind,
  QuestionStatus,
} from "../constants/events-training";
import { VIDEO_CATEGORIES } from "../constants/events-training";

function actorFromRequest(req: AuthenticatedRequest) {
  const uid = req.user?.uid;
  if (!uid) return null;
  return { uid, email: req.user?.email };
}

function bearerIdToken(req: AuthenticatedRequest): string | undefined {
  return req.headers.authorization?.split("Bearer ")[1]?.trim();
}

async function notifyOwnersIfWebinarPublished(
  req: AuthenticatedRequest,
  result: { webinar: { id: string; name: string; startsAt: string | null }; justPublished: boolean },
): Promise<void> {
  if (!result.justPublished) return;
  const idToken = bearerIdToken(req);
  if (!idToken) return;
  void notifyWebinarPublishedViaSmartrefill(idToken, {
    eventId: result.webinar.id,
    name: result.webinar.name,
    startsAt: result.webinar.startsAt,
  }).catch((error) => {
    console.error("notifyOwnersIfWebinarPublished failed", error);
  });
}

async function installPromotionIfWebinarPublished(
  req: AuthenticatedRequest,
  result: {
    webinar: { id: string; name: string; startsAt: string | null };
    justPublished: boolean;
  },
): Promise<void> {
  if (!result.justPublished) return;
  const actor = actorFromRequest(req);
  if (!actor) return;
  try {
    await installWebinarPromotionAutomation({
      webinarId: result.webinar.id,
      actor,
      fireImmediate: true,
    });
  } catch (error) {
    console.error("installWebinarPromotionAutomation failed", error);
  }
}

async function notifyOwnersIfTutorialPublished(
  req: AuthenticatedRequest,
  result: {
    video: {
      id: string;
      name: string;
      category: string;
      appId: string | null;
      appPages: string[];
    };
    justPublished: boolean;
  },
): Promise<void> {
  if (!result.justPublished) return;
  if (result.video.category !== "tutorial") return;
  const idToken = bearerIdToken(req);
  if (!idToken) return;
  void notifyTutorialPublishedViaSmartrefill(idToken, {
    videoId: result.video.id,
    name: result.video.name,
    appId: result.video.appId,
    appPages: result.video.appPages,
  }).catch((error) => {
    console.error("notifyOwnersIfTutorialPublished failed", error);
  });
}

async function notifyOwnersIfResourcesVideoPublished(
  req: AuthenticatedRequest,
  result: {
    video: {
      id: string;
      name: string;
      category: string;
    };
    justPublished: boolean;
  },
): Promise<void> {
  if (!result.justPublished) return;
  if (
    result.video.category !== "wrs_stories" &&
    result.video.category !== "webinar"
  ) {
    return;
  }
  const idToken = bearerIdToken(req);
  if (!idToken) return;
  void notifyResourcesVideoPublishedViaSmartrefill(idToken, {
    videoId: result.video.id,
    name: result.video.name,
    category: result.video.category,
  }).catch((error) => {
    console.error("notifyOwnersIfResourcesVideoPublished failed", error);
  });
}

function mapServiceError(res: Response, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL";
  switch (code) {
  case "NOT_FOUND":
  case "REGISTRATION_NOT_FOUND":
  case "EVENT_NOT_FOUND":
  case "SCHEDULE_NOT_FOUND":
  case "COMMENT_NOT_FOUND":
  case "QUESTION_NOT_FOUND":
  case "CERT_NOT_FOUND":
  case "WEBINAR_NOT_FOUND":
    res.status(404).json({ error: code === "NOT_FOUND" ? "Resource not found." : code });
    return;
  case "NAME_REQUIRED":
  case "TITLE_REQUIRED":
  case "BODY_REQUIRED":
  case "PLAYBACK_URL_REQUIRED":
  case "PREMIUM_PRICE_REQUIRED":
  case "PRIVATE_ACCESS_REQUIRED":
  case "TUTORIAL_APP_REQUIRED":
  case "TUTORIAL_PAGES_REQUIRED":
  case "PUBLISH_APP_REQUIRED":
  case "EMPTY_FILE":
  case "FILE_TOO_LARGE":
  case "INVALID_UPLOAD":
  case "EVENT_AT_CAPACITY":
  case "INVALID_REGISTRATION_TRANSITION":
  case "TARGET_REQUIRED":
  case "TARGET_ID_REQUIRED":
  case "USER_ID_REQUIRED":
  case "RECIPIENT_NAME_REQUIRED":
  case "INVALID_SCHEDULE_KIND":
  case "INVALID_COMMENT_STATUS":
  case "INVALID_ANSWER_TEXT":
  case "INVALID_QUESTION_STATUS":
    res.status(400).json({ error: code });
    return;
  default:
    console.error("events-training error", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function getWebinarsHandler(
  _req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = await listWebinars();
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postWebinarHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const result = await createWebinar(req.body, actor);
    await notifyOwnersIfWebinarPublished(req, result);
    await installPromotionIfWebinarPublished(req, result);
    res.status(201).json({ data: result.webinar });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function patchWebinarHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const result = await updateWebinar(req.params.webinarId, req.body, actor);
    await notifyOwnersIfWebinarPublished(req, result);
    await installPromotionIfWebinarPublished(req, result);
    // Keep countdown times in sync when a published webinar's start moves.
    if (
      !result.justPublished &&
      result.webinar.status === "published" &&
      req.body?.startsAt !== undefined
    ) {
      await installWebinarPromotionAutomation({
        webinarId: result.webinar.id,
        actor,
        fireImmediate: false,
      }).catch((error) => {
        console.error("refresh webinar promotion plan failed", error);
      });
    }
    res.json({ data: result.webinar });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function deleteWebinarHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    await deleteWebinar(req.params.webinarId);
    res.status(204).send();
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function getVideosHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const categoryRaw =
      typeof req.query.category === "string" ? req.query.category.trim() : "";
    const category =
      categoryRaw &&
      (VIDEO_CATEGORIES as readonly string[]).includes(categoryRaw) ?
        (categoryRaw as (typeof VIDEO_CATEGORIES)[number]) :
        undefined;
    const data = await listTrainingVideos(
      category ? { category } : undefined,
    );
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function getTutorialAppsHandler(
  _req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = await listTutorialApps();
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postVideoHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const result = await createTrainingVideo(req.body, actor);
    await notifyOwnersIfTutorialPublished(req, result);
    await notifyOwnersIfResourcesVideoPublished(req, result);
    res.status(201).json({ data: result.video });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function patchVideoHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const result = await updateTrainingVideo(req.params.videoId, req.body, actor);
    await notifyOwnersIfTutorialPublished(req, result);
    await notifyOwnersIfResourcesVideoPublished(req, result);
    res.json({ data: result.video });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function deleteVideoHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    await deleteTrainingVideo(req.params.videoId);
    res.status(204).send();
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function getBlogsHandler(
  _req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = await listWrsBlogs();
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postBlogHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = await createWrsBlog(req.body, actor);
    res.status(201).json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postFormatBlogBodyHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const body = String((req.body as { body?: string })?.body ?? "");
    const title = String((req.body as { title?: string })?.title ?? "");
    const data = await formatBlogBodyWithAi({ body, title });
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function patchBlogHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = await updateWrsBlog(req.params.blogId, req.body, actor);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function deleteBlogHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    await deleteWrsBlog(req.params.blogId);
    res.status(204).send();
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postUploadHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body as {
    kind?: string;
    fileName?: string;
    contentType?: string;
    dataBase64?: string;
  };

  const kind = body.kind === "blog-hero" ? "blog-hero" : body.kind === "thumbnail" ? "thumbnail" : "poster";
  if (!body.dataBase64?.trim() || !body.fileName?.trim()) {
    res.status(400).json({ error: "INVALID_UPLOAD" });
    return;
  }

  try {
    const buffer = Buffer.from(body.dataBase64, "base64");
    const url = await uploadEventsTrainingImage({
      uid: actor.uid,
      kind,
      fileName: body.fileName,
      contentType: body.contentType || "image/jpeg",
      buffer,
    });
    res.status(201).json({ data: { url } });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function getRegistrationsHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const eventId =
      typeof req.query.eventId === "string" ? req.query.eventId : undefined;
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const data = await listRegistrations({ eventId, status });
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function getWebinarRegistrationsHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = await listRegistrations({ eventId: req.params.webinarId });
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postAcceptRegistrationHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = await acceptRegistration(req.params.registrationId, actor.uid);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postDeclineRegistrationHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = await declineRegistration(req.params.registrationId, actor.uid);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postRegistrationAttendanceHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const statusRaw = String(
      (req.body as { attendanceStatus?: string })?.attendanceStatus || "",
    ).trim();
    if (
      statusRaw !== "attended" &&
      statusRaw !== "no_show" &&
      statusRaw !== "cleared"
    ) {
      res.status(400).json({
        error: "attendanceStatus must be attended, no_show, or cleared.",
      });
      return;
    }
    const data = await setRegistrationAttendance(
      req.params.registrationId,
      statusRaw,
      actor.uid,
    );
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function getSchedulesHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const targetType =
      typeof req.query.targetType === "string" ? req.query.targetType : undefined;
    const targetId =
      typeof req.query.targetId === "string" ? req.query.targetId : undefined;
    const data = await listSchedules({ targetType, targetId });
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postScheduleHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = await createSchedule(req.body, actor);
    res.status(201).json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function patchScheduleHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = await updateSchedule(req.params.scheduleId, req.body, actor);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function deleteScheduleHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    await deleteSchedule(req.params.scheduleId);
    res.status(204).send();
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postSchedulePreviewHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const body = req.body as {
      webinarId?: string;
      purpose?: string;
      messageTemplate?: string;
    };
    const data = await previewWebinarScheduleMessage({
      webinarId: String(body.webinarId ?? ""),
      purpose: body.purpose,
      messageTemplate: body.messageTemplate,
    });
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postScheduleMetaQueueHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const body = req.body as {
      webinarId?: string;
      purpose?: string;
      scheduleId?: string;
    };
    const purpose = String(body.purpose || "new_webinar");
    const data = await queueMetaCommunityPost({
      webinarId: String(body.webinarId ?? ""),
      purpose: purpose as
        | "new_webinar"
        | "upcoming_webinar"
        | "ongoing_webinar"
        | "reminder",
      scheduleId: body.scheduleId,
      actorUid: actor.uid,
    });
    res.status(201).json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function getWebinarAutomationHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = await getWebinarAutomationPlan(String(req.params.webinarId ?? ""));
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postWebinarAutomationInstallHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const fireImmediate = req.body?.fireImmediate === true;
    const data = await installWebinarPromotionAutomation({
      webinarId: String(req.params.webinarId ?? ""),
      actor,
      fireImmediate,
    });
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function putWebinarAutomationEnabledHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const enabled = req.body?.enabled === true || req.body?.enabled === "true";
    const data = await setWebinarPromotionAutomationEnabled({
      webinarId: String(req.params.webinarId ?? ""),
      enabled,
      actor,
    });
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postWebinarAutomationPreviewHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = await previewAutomationMilestone({
      webinarId: String(req.params.webinarId ?? ""),
      milestoneKey: String(req.body?.milestoneKey || "publish") as
        | "publish"
        | "weekly"
        | "d7"
        | "d3"
        | "d2"
        | "d1"
        | "h1"
        | "ongoing",
    });
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function getModerationInboxHandler(
  _req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = await listModerationInbox();
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function getVideoCommentsHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = await listVideoComments(req.params.videoId, {
      includeHidden: true,
    });
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function patchVideoCommentHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const status = String(req.body?.status || "") as CommentStatus;
    const data = await moderateComment(
      "video",
      req.params.videoId,
      req.params.commentId,
      status,
    );
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function getBlogCommentsHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = await listBlogComments(req.params.blogId, {
      includeHidden: true,
    });
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function patchBlogCommentHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const status = String(req.body?.status || "") as CommentStatus;
    const data = await moderateComment(
      "blog" as ContentParentKind,
      req.params.blogId,
      req.params.commentId,
      status,
    );
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function getVideoQuestionsHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = await listQuestions(req.params.videoId);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function patchVideoQuestionHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const answer =
      typeof req.body?.answer === "string" ? req.body.answer : undefined;
    const status =
      typeof req.body?.status === "string" ?
        (req.body.status as QuestionStatus) :
        undefined;

    const data = answer ?
      await answerQuestion(req.params.videoId, req.params.questionId, {
        answer,
        status,
        answeredBy: actor.uid,
      }) :
      await setQuestionStatus(
        req.params.videoId,
        req.params.questionId,
        status ?? "closed",
      );
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function getCertificationsHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const userId =
      typeof req.query.userId === "string" ? req.query.userId : undefined;
    const targetId =
      typeof req.query.targetId === "string" ? req.query.targetId : undefined;
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const data = await listCertifications({ userId, targetId, status });
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postCertificationHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = await issueCertification({
      ...req.body,
      issuedBy: actor.uid,
      enableTemplateIfMissing: true,
      requireTemplateEnabled: false,
    });
    if (!data) {
      res.status(400).json({ error: "Unable to issue certification." });
      return;
    }
    res.status(201).json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postCertificatePreviewHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const body = req.body as {
      appLabel?: string;
      appId?: string;
      logoUrl?: string;
      recipientName?: string;
      title?: string;
      courseName?: string;
      speaker?: string;
      eventDateLabel?: string;
      webinarId?: string;
    };
    let appLabel = String(body.appLabel ?? "").trim();
    let logoUrl =
      typeof body.logoUrl === "string" ? body.logoUrl.trim() : "";
    if ((!appLabel || !logoUrl) && body.appId) {
      const app = await getTutorialApp(String(body.appId));
      if (!appLabel) appLabel = app?.label || String(body.appId);
      if (!logoUrl) logoUrl = app?.logoUrl || "";
    }
    const svg = await previewCertificateSvg({
      appLabel: appLabel || "Training",
      appId: body.appId ? String(body.appId) : undefined,
      logoUrl: logoUrl || null,
      recipientName: String(body.recipientName ?? ""),
      title: String(body.title ?? ""),
      courseName: String(body.courseName ?? ""),
      speaker: String(body.speaker ?? ""),
      eventDateLabel: String(body.eventDateLabel ?? ""),
      webinarId: body.webinarId ? String(body.webinarId) : undefined,
    });
    res.json({ data: { svg } });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function putWebinarCertificateTemplateHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const enabled = req.body?.enabled === true || req.body?.enabled === "true";
    const data = await setWebinarCertificateTemplate({
      webinarId: String(req.params.webinarId ?? ""),
      enabled,
    });
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function postRevokeCertificationHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  const actor = actorFromRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const data = await revokeCertification(req.params.certId, actor.uid);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}

export async function getAnalyticsHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const periodDays = clampPeriodDays(req.query.periodDays);
    const data = await getEventsTrainingAnalytics(periodDays);
    res.json({ data });
  } catch (error) {
    mapServiceError(res, error);
  }
}
