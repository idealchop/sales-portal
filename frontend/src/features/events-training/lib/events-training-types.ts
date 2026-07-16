export type WebinarStatus =
  | "draft"
  | "published"
  | "cancelled"
  | "completed"
  | "archived";

export type VideoStatus = "draft" | "published" | "archived";

export type BlogStatus = "draft" | "published" | "archived";

export type VideoVisibility = "public" | "premium" | "private";

export type PlaybackProvider = "youtube" | "loom" | "vimeo" | "other";

export type VideoCategory = "wrs_stories" | "webinar" | "tutorial";

export type TutorialTargetAppId = string;

export type TutorialAppPage = string;

export type TutorialAppOption = {
  id: string;
  label: string;
  pages: string[];
  /** Public logo URL when available on `apps/{id}`. */
  logoUrl?: string | null;
};

export type WebinarRecord = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  speaker: string;
  host: string;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  posterUrl: string | null;
  status: WebinarStatus;
  /** Firestore `apps/{appId}` this webinar publishes for. */
  appId?: string;
  /** Who may register: private (member tiers) or premium (paid unlock). */
  visibility: VideoVisibility;
  priceCents: number;
  currency: string;
  allowedPlanCodes: string[];
  allowAllMembers: boolean;
  capacity: number | null;
  registrationCount: number;
  /** SmartRefill auto-accepts when true (no pending ops review). */
  autoAccept?: boolean;
  joinLink: string | null;
  linkedVideoId: string | null;
  certificationEnabled: boolean;
  archivedAt: string | null;
};

export type TrainingVideoRecord = {
  id: string;
  name: string;
  description: string;
  recordedAt: string | null;
  status: VideoStatus;
  category: VideoCategory;
  subcategory: string | null;
  appId: TutorialTargetAppId | null;
  appPages: string[];
  webinarEventId: string | null;
  playbackProvider: PlaybackProvider;
  playbackUrl: string;
  playbackId: string | null;
  thumbnailUrl: string | null;
  featured: boolean;
  sortOrder: number;
  visibility: VideoVisibility;
  priceCents: number;
  currency: string;
  allowedPlanCodes: string[];
  allowAllMembers: boolean;
  certificationEnabled: boolean;
  archivedAt: string | null;
  tags: string[];
};

export type WrsBlogRecord = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  /** Display byline shown on Resources. */
  authorName?: string;
  heroImageUrl: string | null;
  status: BlogStatus;
  /** Firestore `apps/{appId}` this article publishes for. */
  appId?: string;
  visibility?: VideoVisibility;
  priceCents?: number;
  currency?: string;
  allowedPlanCodes?: string[];
  allowAllMembers?: boolean;
  /** Highlighted on Resources blog listings. */
  featured?: boolean;
  publishedAt: string | null;
  archivedAt: string | null;
  tags: string[];
  allowAnonymousComments: boolean;
};

export const WEBINAR_STATUSES: WebinarStatus[] = [
  "draft",
  "published",
  "cancelled",
  "completed",
  "archived",
];

export const VIDEO_STATUSES: VideoStatus[] = ["draft", "published", "archived"];

export const BLOG_STATUSES: BlogStatus[] = ["draft", "published", "archived"];

export const VIDEO_VISIBILITY_OPTIONS: VideoVisibility[] = [
  "public",
  "premium",
  "private",
];

export const VIDEO_VISIBILITY_LABELS: Record<VideoVisibility, string> = {
  public: "Public — anyone can watch",
  premium: "Premium — paid unlock",
  private: "Private — members / subscribers",
};

export const PLAYBACK_PROVIDERS: PlaybackProvider[] = [
  "youtube",
  "loom",
  "vimeo",
  "other",
];

export const VIDEO_CATEGORIES: VideoCategory[] = [
  "wrs_stories",
  "webinar",
  "tutorial",
];

/** Discriminator value for video tutorials in `training_videos`. */
export const VIDEO_CATEGORY_TUTORIAL = "tutorial" as const;

export const VIDEO_CATEGORY_LABELS: Record<VideoCategory, string> = {
  wrs_stories: "WRS Stories",
  webinar: "Webinar recordings",
  tutorial: "Video tutorials",
};

export const VIDEO_CATEGORY_PATHS: Record<VideoCategory, string> = {
  wrs_stories: "/resources/wrs-stories",
  webinar: "/resources/webinars",
  tutorial: "/resources/tutorials",
};

/** Fallback when `/events-training/apps` is unavailable. Prefer live apps lookup. */
export const TUTORIAL_TARGET_APPS: TutorialAppOption[] = [
  {
    id: "smartrefill",
    label: "Smart Refill",
    logoUrl:
      "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Brand%20Logo%2FAsset%2022.png?alt=media&token=f7458efe-afd7-4006-862e-40c8d524c080",
    pages: [
      "dashboard",
      "transactions",
      "customers",
      "inventory",
      "accounts",
      "operations",
    ],
  },
];

export const DEFAULT_TUTORIAL_APP_PAGES_BY_APP: Record<string, readonly string[]> =
  Object.fromEntries(
    TUTORIAL_TARGET_APPS.map((app) => [app.id, app.pages]),
  );

/** @deprecated Prefer apps from fetchTutorialApps(). */
export const TUTORIAL_APP_PAGES_BY_APP = DEFAULT_TUTORIAL_APP_PAGES_BY_APP;

export const TUTORIAL_APP_PAGES = DEFAULT_TUTORIAL_APP_PAGES_BY_APP.smartrefill;

export const TUTORIAL_APP_PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  transactions: "Transactions",
  customers: "Customers",
  inventory: "Inventory",
  accounts: "Accounts",
  operations: "Operations",
};

function humanizeToken(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function tutorialPageLabel(page: string): string {
  return TUTORIAL_APP_PAGE_LABELS[page] ?? humanizeToken(page);
}

export function tutorialTargetAppLabel(
  appId: string | null | undefined,
  apps: TutorialAppOption[] = TUTORIAL_TARGET_APPS,
): string {
  const app = apps.find((entry) => entry.id === appId);
  return app?.label ?? (appId ? humanizeToken(appId) : "—");
}

export function pagesForTutorialApp(
  appId: string | null | undefined,
  apps: TutorialAppOption[] = TUTORIAL_TARGET_APPS,
): readonly string[] {
  if (!appId) return [];
  const fromList = apps.find((entry) => entry.id === appId);
  if (fromList) return fromList.pages;
  return DEFAULT_TUTORIAL_APP_PAGES_BY_APP[appId] ?? [];
}

/** @deprecated Prefer TUTORIAL_TARGET_APPS / appId field. */
export const VIDEO_PUBLISH_APP = {
  id: "smartrefill",
  label: "Smart Refill",
} as const;

export const WEBINAR_SUBCATEGORIES = [
  "business-growth",
  "smartrefill-updates",
] as const;

export type RegistrationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled";

export type CommentStatus = "visible" | "hidden" | "flagged";

export type QuestionStatus = "open" | "answered" | "closed";

export type CertificationStatus = "issued" | "revoked";

export type ScheduleKind =
  | "fixed_datetime"
  | "recurring_weekday"
  | "relative_before_event";

export type SchedulePurpose =
  | "new_webinar"
  | "upcoming_webinar"
  | "ongoing_webinar"
  | "reminder";

export type ScheduleChannel = "email" | "in_app" | "push";

export type ScheduleTargetType = "webinar_event" | "training_video";

export type ScheduleAudience = "registrants" | "all_members" | "purchasers";

export type ComposedWebinarScheduleMessage = {
  purpose: SchedulePurpose;
  subject: string;
  emailBody: string;
  /** @deprecated Kept for API compatibility; unused after Meta removal. */
  metaCaption: string;
  registerUrl: string;
  posterUrl: string | null;
  seatsRemaining: number | null;
  capacity: number | null;
  certificationEnabled: boolean;
  phase: "new" | "upcoming" | "ongoing" | "completed" | "other";
  emailTemplateKey: string;
};

export type CertTargetType = "training_video" | "webinar_event";

export type RegistrationRecord = {
  id: string;
  eventId: string;
  userId: string;
  businessId: string;
  email: string;
  status: RegistrationStatus;
  emailReminderOptIn: boolean;
  joinLink: string | null;
  attendanceStatus?: "attended" | "no_show" | null;
  attendedAt?: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  lastReminderSentAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ScheduleRecord = {
  id: string;
  targetType: ScheduleTargetType;
  targetId: string;
  purpose: SchedulePurpose;
  scheduleKind: ScheduleKind;
  fixedAt: string | null;
  weekday: number | null;
  daysBefore: number | null;
  channels: ScheduleChannel[];
  audience: ScheduleAudience;
  messageTemplate: string;
  emailTemplateKey: string | null;
  metaChannel: boolean;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CommentRecord = {
  id: string;
  text: string;
  displayName: string | null;
  parentId: string | null;
  authorType: "anonymous" | "member" | "staff";
  userId: string | null;
  status: CommentStatus;
  createdAt: string | null;
  updatedAt: string | null;
};

export type QuestionRecord = {
  id: string;
  text: string;
  userId: string;
  displayName: string | null;
  status: QuestionStatus;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ModerationCommentItem = CommentRecord & {
  kind: "comment";
  contentKind: "video" | "blog";
  contentId: string;
  contentTitle: string;
};

export type ModerationQuestionItem = QuestionRecord & {
  kind: "question";
  contentKind: "video";
  contentId: string;
  contentTitle: string;
};

export type ModerationInbox = {
  comments: ModerationCommentItem[];
  questions: ModerationQuestionItem[];
  counts: {
    openQuestions: number;
    flaggedComments: number;
    comments: number;
    questions: number;
  };
};

export type CertificationRecord = {
  id: string;
  userId: string;
  businessId: string;
  /** Firestore `apps/{appId}` this certificate is issued for. */
  appId?: string;
  recipientName?: string;
  targetType: CertTargetType;
  targetId: string;
  title: string;
  courseName?: string;
  speaker?: string;
  eventStartsAt?: string | null;
  issuedBy: string;
  issuedAt: string | null;
  revokedAt: string | null;
  certificateUrl: string | null;
  status: CertificationStatus;
};

export type AnalyticsDayPoint = {
  date: string;
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  cancelled: number;
};

export type AnalyticsRevenueDayPoint = {
  date: string;
  count: number;
  revenueCents: number;
};

export type AnalyticsNamedCount = {
  key: string;
  label: string;
  count: number;
};

export type AnalyticsContentRank = {
  key: string;
  label: string;
  count: number;
  category?: string;
};

export type EventsTrainingAnalyticsSummary = {
  periodDays: number;
  webinars: {
    total: number;
    published: number;
    archived: number;
    draft?: number;
    completed?: number;
    cancelled?: number;
    registrations: number;
    pending: number;
    accepted: number;
    declined?: number;
    cancelledRegs?: number;
  };
  videos: {
    total: number;
    published: number;
    archived: number;
    draft?: number;
    totalViews: number;
    totalPurchases: number;
    totalComments: number;
    totalQuestions: number;
    byCategory?: AnalyticsNamedCount[];
  };
  revenue: {
    paidPurchaseCount: number;
    revenueCents: number;
    currency: string;
  };
  engagement: {
    scheduleCount: number;
    enabledSchedules: number;
  };
  series?: {
    registrationsDaily: AnalyticsDayPoint[];
    revenueDaily: AnalyticsRevenueDayPoint[];
  };
  breakdowns?: {
    registrationStatus: AnalyticsNamedCount[];
    webinarStatus: AnalyticsNamedCount[];
    videoStatus: AnalyticsNamedCount[];
    videoEngagement: AnalyticsNamedCount[];
  };
  rankings?: {
    topVideosByViews: AnalyticsContentRank[];
    topVideosByComments: AnalyticsContentRank[];
    topVideosByPurchases: AnalyticsContentRank[];
    topWebinarsByRegistrations: AnalyticsContentRank[];
  };
};

export const REGISTRATION_STATUSES: RegistrationStatus[] = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
];

export const COMMENT_STATUSES: CommentStatus[] = [
  "visible",
  "hidden",
  "flagged",
];

export const QUESTION_STATUSES: QuestionStatus[] = [
  "open",
  "answered",
  "closed",
];

export const CERT_STATUSES: CertificationStatus[] = ["issued", "revoked"];

export const SCHEDULE_KINDS: ScheduleKind[] = [
  "fixed_datetime",
  "recurring_weekday",
  "relative_before_event",
];

export const SCHEDULE_PURPOSES: SchedulePurpose[] = [
  "new_webinar",
  "upcoming_webinar",
  "ongoing_webinar",
  "reminder",
];

export const SCHEDULE_PURPOSE_LABELS: Record<SchedulePurpose, string> = {
  new_webinar: "New webinar",
  upcoming_webinar: "Upcoming webinar",
  ongoing_webinar: "On-going webinar",
  reminder: "Reminder",
};

export const SCHEDULE_CHANNELS: ScheduleChannel[] = [
  "email",
  "in_app",
  "push",
];

export const SCHEDULE_CHANNEL_LABELS: Record<ScheduleChannel, string> = {
  email: "Email",
  in_app: "In-app",
  push: "Push",
};

export const SCHEDULE_TARGET_TYPES: ScheduleTargetType[] = [
  "webinar_event",
  "training_video",
];

export const SCHEDULE_AUDIENCES: ScheduleAudience[] = [
  "registrants",
  "all_members",
  "purchasers",
];

export const SCHEDULE_AUDIENCE_LABELS: Record<ScheduleAudience, string> = {
  registrants: "Registered attendees",
  all_members: "All members (encourage register)",
  purchasers: "Purchasers",
};

export const CERT_TARGET_TYPES: CertTargetType[] = ["webinar_event"];
