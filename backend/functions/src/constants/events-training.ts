export const EVENTS_TRAINING_APP_ID = "smartrefill";

export const EVENTS_TRAINING_COLLECTIONS = {
  webinarEvents: "webinar_events",
  trainingVideos: "training_videos",
  wrsBlogs: "wrs_blogs",
  webinarRegistrations: "webinar_registrations",
  eventsTrainingSchedules: "events_training_schedules",
  videoPurchases: "video_purchases",
  privateAccessUsage: "private_access_usage",
  trainingCertifications: "training_certifications",
  metaPostLog: "meta_post_log",
  /** Member likes / comments / questions (SmartRefill). */
  trainingVideoEngagement: "training_video_engagement",
} as const;

export const VIDEO_VISIBILITY = [
  "public",
  "premium",
  "private",
] as const;

export const PLAYBACK_PROVIDERS = [
  "youtube",
  "loom",
  "vimeo",
  "other",
] as const;

export const VIDEO_CATEGORIES = ["wrs_stories", "webinar", "tutorial"] as const;

/**
 * Discriminator on `apps/{appId}/training_videos` docs.
 * Video tutorials MUST persist `category: "tutorial"` (plus `appId` / `appPages`).
 */
export const VIDEO_CATEGORY_TUTORIAL = "tutorial" as const;

/**
 * Fallback page ids when `apps/{appId}.tutorialPages` is unset.
 * Live app list comes from the Firestore `apps` collection.
 */
export const DEFAULT_TUTORIAL_APP_PAGES_BY_APP: Record<string, readonly string[]> = {
  smartrefill: [
    "dashboard",
    "transactions",
    "customers",
    "inventory",
    "accounts",
    "operations",
  ],
};

/** @deprecated Prefer listTutorialApps(); kept for tests / migration helpers. */
export const TUTORIAL_TARGET_APPS = [
  { id: "smartrefill", label: "Smart Refill" },
] as const;

/** @deprecated Prefer DEFAULT_TUTORIAL_APP_PAGES_BY_APP. */
export const TUTORIAL_APP_PAGES_BY_APP = DEFAULT_TUTORIAL_APP_PAGES_BY_APP;

/** Flattened page ids used for typing / migration. */
export const TUTORIAL_APP_PAGES = DEFAULT_TUTORIAL_APP_PAGES_BY_APP.smartrefill;

export const WEBINAR_STATUSES = [
  "draft",
  "published",
  "cancelled",
  "completed",
  "archived",
] as const;

export const VIDEO_STATUSES = ["draft", "published", "archived"] as const;

export const BLOG_STATUSES = ["draft", "published", "archived"] as const;

export const REGISTRATION_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
] as const;

export const COMMENT_STATUSES = ["visible", "hidden", "flagged"] as const;

export const COMMENT_AUTHOR_TYPES = ["anonymous", "member", "staff"] as const;

export const QUESTION_STATUSES = ["open", "answered", "closed"] as const;

export const CERT_STATUSES = ["issued", "revoked"] as const;

export const SCHEDULE_KINDS = [
  "fixed_datetime",
  "recurring_weekday",
  "relative_before_event",
] as const;

/** Why this schedule exists — drives default copy, audience, and channels. */
export const SCHEDULE_PURPOSES = [
  "new_webinar",
  "upcoming_webinar",
  "ongoing_webinar",
  "reminder",
] as const;

export const SCHEDULE_CHANNELS = ["email", "in_app", "push", "meta"] as const;

export const SCHEDULE_TARGET_TYPES = [
  "webinar_event",
  "training_video",
] as const;

export const SCHEDULE_AUDIENCES = [
  "registrants",
  "all_members",
  "purchasers",
] as const;

export const CERT_TARGET_TYPES = [
  "training_video",
  "webinar_event",
] as const;

export type VideoVisibility = (typeof VIDEO_VISIBILITY)[number];
export type PlaybackProvider = (typeof PLAYBACK_PROVIDERS)[number];
export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];
export type TutorialTargetAppId = string;
export type TutorialAppPage = string;
export type WebinarStatus = (typeof WEBINAR_STATUSES)[number];
export type VideoStatus = (typeof VIDEO_STATUSES)[number];
export type BlogStatus = (typeof BLOG_STATUSES)[number];
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];
export type CommentStatus = (typeof COMMENT_STATUSES)[number];
export type CommentAuthorType = (typeof COMMENT_AUTHOR_TYPES)[number];
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];
export type CertificationStatus = (typeof CERT_STATUSES)[number];
export type ScheduleKind = (typeof SCHEDULE_KINDS)[number];
export type SchedulePurpose = (typeof SCHEDULE_PURPOSES)[number];
export type ScheduleChannel = (typeof SCHEDULE_CHANNELS)[number];
export type ScheduleTargetType = (typeof SCHEDULE_TARGET_TYPES)[number];
export type ScheduleAudience = (typeof SCHEDULE_AUDIENCES)[number];
export type CertTargetType = (typeof CERT_TARGET_TYPES)[number];
export type ContentParentKind = "video" | "blog";
