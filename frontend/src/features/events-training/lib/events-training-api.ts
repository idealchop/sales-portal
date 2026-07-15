import { apiClient } from "@/lib/api-client";
import type {
  CertificationRecord,
  CommentRecord,
  CommentStatus,
  ComposedWebinarScheduleMessage,
  EventsTrainingAnalyticsSummary,
  ModerationInbox,
  QuestionRecord,
  QuestionStatus,
  RegistrationRecord,
  SchedulePurpose,
  ScheduleRecord,
  TrainingVideoRecord,
  TutorialAppOption,
  WebinarRecord,
  WrsBlogRecord,
} from "./events-training-types";

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function fetchWebinars() {
  const res = await apiClient.get<{ data: WebinarRecord[] }>("/events-training/webinars");
  return res.data;
}

export async function createWebinar(input: Partial<WebinarRecord>) {
  const res = await apiClient.post<{ data: WebinarRecord }>("/events-training/webinars", input);
  return res.data;
}

export async function updateWebinar(webinarId: string, input: Partial<WebinarRecord>) {
  const res = await apiClient.patch<{ data: WebinarRecord }>(
    `/events-training/webinars/${webinarId}`,
    input,
  );
  return res.data;
}

export async function deleteWebinar(webinarId: string) {
  await apiClient.delete(`/events-training/webinars/${webinarId}`);
}

export async function fetchTrainingVideos(options?: {
  category?: TrainingVideoRecord["category"];
}) {
  const params = options?.category
    ? `?category=${encodeURIComponent(options.category)}`
    : "";
  const res = await apiClient.get<{ data: TrainingVideoRecord[] }>(
    `/events-training/videos${params}`,
  );
  return res.data;
}

export async function fetchTutorialApps() {
  const res = await apiClient.get<{ data: TutorialAppOption[] }>("/events-training/apps");
  return res.data;
}

export async function createTrainingVideo(input: Partial<TrainingVideoRecord>) {
  const res = await apiClient.post<{ data: TrainingVideoRecord }>("/events-training/videos", input);
  return res.data;
}

export async function updateTrainingVideo(
  videoId: string,
  input: Partial<TrainingVideoRecord>,
) {
  const res = await apiClient.patch<{ data: TrainingVideoRecord }>(
    `/events-training/videos/${videoId}`,
    input,
  );
  return res.data;
}

export async function deleteTrainingVideo(videoId: string) {
  await apiClient.delete(`/events-training/videos/${videoId}`);
}

export async function fetchWrsBlogs() {
  const res = await apiClient.get<{ data: WrsBlogRecord[] }>("/events-training/blogs");
  return res.data;
}

export async function createWrsBlog(input: Partial<WrsBlogRecord>) {
  const res = await apiClient.post<{ data: WrsBlogRecord }>("/events-training/blogs", input);
  return res.data;
}

export async function updateWrsBlog(blogId: string, input: Partial<WrsBlogRecord>) {
  const res = await apiClient.patch<{ data: WrsBlogRecord }>(
    `/events-training/blogs/${blogId}`,
    input,
  );
  return res.data;
}

export async function deleteWrsBlog(blogId: string) {
  await apiClient.delete(`/events-training/blogs/${blogId}`);
}

export async function formatWrsBlogBodyHtml(input: {
  body: string;
  title?: string;
}) {
  const res = await apiClient.post<{
    data: { html: string; source: "ai" | "fallback" };
  }>("/events-training/blogs/format-html", input);
  return res.data;
}

export async function uploadEventsTrainingImage(
  file: File,
  kind: "poster" | "thumbnail" | "blog-hero",
) {
  const dataBase64 = await fileToBase64(file);
  const res = await apiClient.post<{ data: { url: string } }>("/events-training/upload", {
    kind,
    fileName: file.name,
    contentType: file.type || "image/jpeg",
    dataBase64,
  });
  return res.data.url;
}

export function formatPricePesos(priceCents: number): string {
  return `₱${(priceCents / 100).toFixed(2)}`;
}

export function parsePricePesosToCents(input: string): number {
  const n = Number.parseFloat(input.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export async function fetchRegistrations(params?: {
  eventId?: string;
  status?: string;
}) {
  const search = new URLSearchParams();
  if (params?.eventId) search.set("eventId", params.eventId);
  if (params?.status) search.set("status", params.status);
  const qs = search.toString();
  const res = await apiClient.get<{ data: RegistrationRecord[] }>(
    `/events-training/registrations${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function acceptRegistration(registrationId: string) {
  const res = await apiClient.post<{ data: RegistrationRecord }>(
    `/events-training/registrations/${registrationId}/accept`,
  );
  return res.data;
}

export async function declineRegistration(registrationId: string) {
  const res = await apiClient.post<{ data: RegistrationRecord }>(
    `/events-training/registrations/${registrationId}/decline`,
  );
  return res.data;
}

export async function setRegistrationAttendance(
  registrationId: string,
  attendanceStatus: "attended" | "no_show" | "cleared",
) {
  const res = await apiClient.post<{ data: RegistrationRecord }>(
    `/events-training/registrations/${registrationId}/attendance`,
    { attendanceStatus },
  );
  return res.data;
}

export async function fetchSchedules(params?: {
  targetType?: string;
  targetId?: string;
}) {
  const search = new URLSearchParams();
  if (params?.targetType) search.set("targetType", params.targetType);
  if (params?.targetId) search.set("targetId", params.targetId);
  const qs = search.toString();
  const res = await apiClient.get<{ data: ScheduleRecord[] }>(
    `/events-training/schedules${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function createSchedule(input: Partial<ScheduleRecord>) {
  const res = await apiClient.post<{ data: ScheduleRecord }>(
    "/events-training/schedules",
    input,
  );
  return res.data;
}

export async function updateSchedule(
  scheduleId: string,
  input: Partial<ScheduleRecord>,
) {
  const res = await apiClient.patch<{ data: ScheduleRecord }>(
    `/events-training/schedules/${scheduleId}`,
    input,
  );
  return res.data;
}

export async function deleteSchedule(scheduleId: string) {
  await apiClient.delete(`/events-training/schedules/${scheduleId}`);
}

export async function previewScheduleMessage(input: {
  webinarId: string;
  purpose: SchedulePurpose;
  messageTemplate?: string;
}) {
  const res = await apiClient.post<{ data: ComposedWebinarScheduleMessage }>(
    "/events-training/schedules/preview",
    input,
  );
  return res.data;
}

export async function queueScheduleMetaPost(input: {
  webinarId: string;
  purpose: SchedulePurpose;
  scheduleId?: string;
}) {
  const res = await apiClient.post<{
    data: { id: string; caption: string; registerUrl: string };
  }>("/events-training/schedules/meta-queue", input);
  return res.data;
}

export type WebinarAutomationPlan = {
  webinarId: string;
  webinarName: string;
  startsAt: string | null;
  status: string;
  automationEnabled: boolean;
  items: Array<{
    milestoneKey: string;
    label: string;
    purpose: SchedulePurpose;
    audience: string;
    channels: string[];
    scheduleId: string | null;
    enabled: boolean;
    nextRunAt: string | null;
    lastRunAt: string | null;
    daysBefore: number | null;
    hoursBefore: number | null;
    scheduleKind: string;
  }>;
};

export async function fetchWebinarAutomation(webinarId: string) {
  const res = await apiClient.get<{ data: WebinarAutomationPlan }>(
    `/events-training/webinars/${webinarId}/automation`,
  );
  return res.data;
}

export async function installWebinarAutomation(
  webinarId: string,
  fireImmediate = false,
) {
  const res = await apiClient.post<{ data: WebinarAutomationPlan }>(
    `/events-training/webinars/${webinarId}/automation/install`,
    { fireImmediate },
  );
  return res.data;
}

export async function setWebinarAutomationEnabled(
  webinarId: string,
  enabled: boolean,
) {
  const res = await apiClient.put<{ data: WebinarAutomationPlan }>(
    `/events-training/webinars/${webinarId}/automation`,
    { enabled },
  );
  return res.data;
}

export async function previewWebinarAutomationMilestone(
  webinarId: string,
  milestoneKey: string,
) {
  const res = await apiClient.post<{ data: ComposedWebinarScheduleMessage }>(
    `/events-training/webinars/${webinarId}/automation/preview`,
    { milestoneKey },
  );
  return res.data;
}

export async function fetchModerationInbox() {
  const res = await apiClient.get<{ data: ModerationInbox }>(
    "/events-training/moderation/inbox",
  );
  return res.data;
}

export async function fetchVideoComments(videoId: string) {
  const res = await apiClient.get<{ data: CommentRecord[] }>(
    `/events-training/videos/${videoId}/comments`,
  );
  return res.data;
}

export async function moderateVideoComment(
  videoId: string,
  commentId: string,
  status: CommentStatus,
) {
  const res = await apiClient.patch<{ data: CommentRecord }>(
    `/events-training/videos/${videoId}/comments/${commentId}`,
    { status },
  );
  return res.data;
}

export async function fetchBlogComments(blogId: string) {
  const res = await apiClient.get<{ data: CommentRecord[] }>(
    `/events-training/blogs/${blogId}/comments`,
  );
  return res.data;
}

export async function moderateBlogComment(
  blogId: string,
  commentId: string,
  status: CommentStatus,
) {
  const res = await apiClient.patch<{ data: CommentRecord }>(
    `/events-training/blogs/${blogId}/comments/${commentId}`,
    { status },
  );
  return res.data;
}

export async function fetchVideoQuestions(videoId: string) {
  const res = await apiClient.get<{ data: QuestionRecord[] }>(
    `/events-training/videos/${videoId}/questions`,
  );
  return res.data;
}

export async function updateVideoQuestion(
  videoId: string,
  questionId: string,
  input: { answer?: string; status?: QuestionStatus },
) {
  const res = await apiClient.patch<{ data: QuestionRecord }>(
    `/events-training/videos/${videoId}/questions/${questionId}`,
    input,
  );
  return res.data;
}

export async function fetchCertifications(params?: {
  userId?: string;
  targetId?: string;
  status?: string;
}) {
  const search = new URLSearchParams();
  if (params?.userId) search.set("userId", params.userId);
  if (params?.targetId) search.set("targetId", params.targetId);
  if (params?.status) search.set("status", params.status);
  const qs = search.toString();
  const res = await apiClient.get<{ data: CertificationRecord[] }>(
    `/events-training/certifications${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function issueCertification(
  input: Partial<CertificationRecord> & {
    userId: string;
    targetId: string;
    recipientName: string;
    title?: string;
    appId?: string;
    targetType?: "webinar_event";
  },
) {
  const res = await apiClient.post<{ data: CertificationRecord }>(
    "/events-training/certifications",
    { ...input, targetType: "webinar_event" },
  );
  return res.data;
}

export async function previewCertificationSvg(input: {
  appId?: string;
  appLabel?: string;
  logoUrl?: string | null;
  recipientName?: string;
  title?: string;
  courseName?: string;
  speaker?: string;
  eventDateLabel?: string;
  webinarId?: string;
}) {
  const res = await apiClient.post<{ data: { svg: string } }>(
    "/events-training/certifications/preview",
    input,
  );
  return res.data;
}

export async function setWebinarCertificateTemplate(
  webinarId: string,
  enabled: boolean,
) {
  const res = await apiClient.put<{
    data: { webinarId: string; certificationEnabled: boolean };
  }>(`/events-training/webinars/${webinarId}/certificate-template`, {
    enabled,
  });
  return res.data;
}

export async function revokeCertification(certId: string) {
  const res = await apiClient.post<{ data: CertificationRecord }>(
    `/events-training/certifications/${certId}/revoke`,
  );
  return res.data;
}

export async function fetchEventsTrainingAnalytics(periodDays = 30) {
  const res = await apiClient.get<{ data: EventsTrainingAnalyticsSummary }>(
    `/events-training/analytics?periodDays=${periodDays}`,
  );
  return res.data;
}
