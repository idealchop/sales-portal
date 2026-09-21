export type WithId<T> = T & { id: string };

export type ClientAppAccess = {
  appId: string;
  role?: string;
  label: string;
};

export type Client = {
  id: string;
  userId: string;
  companyName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  status?: string;
  clientType?: "household" | "sme" | "commercial" | "corporate" | "enterprise";
  linkedUserId?: string;
  appIds?: string[];
  apps?: ClientAppAccess[];
};

export type ClientDirectoryEntry = {
  linkedUserId: string;
  displayName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  apps: ClientAppAccess[];
  appIds: string[];
  clientId?: string;
  clientStatus?: string;
};

export type OutreachRecipientSource =
  | "platform_user"
  | "crm_client"
  | "webinar_guest"
  | "webinar_member"
  | "story_engagement"
  | "article_engagement";

export type OutreachRecipient = {
  id: string;
  email: string;
  displayName: string;
  companyName?: string;
  source: OutreachRecipientSource;
  sourceLabel: string;
  appId?: string;
  appLabel?: string;
  apps?: ClientAppAccess[];
};

export type Proposal = {
  id: string;
  clientId: string;
  userId: string;
  title?: string;
  content?: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "finalized";
  amount: number;
  createdAt: string;
  sourceLocation?: string;
};

export type Commission = {
  id: string;
  userId: string;
  proposalId?: string;
  amount: number;
  status: "pending" | "paid";
  type: "commission" | "bonus";
  description: string;
  createdAt: string;
  referenceId?: string;
};

export type UserProfile = {
  id: string;
  email?: string;
  displayName: string;
  phone?: string;
  role: "sales" | "admin" | "manager";
  team?: string;
  location?: string;
  birthday?: string;
  photoURL?: string | null;
  onboardingCompleted?: boolean;
};

export type Revenue = {
  month: string;
  revenue: number;
};

export type PayoutCommission = Commission & { clientName?: string };

export type MonthlyPayout = {
  month: string;
  totalAmount: number;
  status: "paid" | "pending";
  timelineStatus: "calculated" | "reviewed" | "processing" | "paid";
  commissions: WithId<PayoutCommission>[];
  transactionId: string;
};

export type LeadStage =
  | "inquire"
  | "warm"
  | "cold"
  | "registered"
  | "onboarded"
  | "archive";

export type LeadQueue =
  | "all"
  | "content"
  | "warm"
  | "cold"
  | "onboarded"
  | "archive";

/** Which SmartRefill database the row was loaded from. */
export type LeadPlatformSource = "smartrefill" | "smartrefill_legacy";

export type LeadChannels = {
  viber: boolean;
  email: boolean;
  messenger: boolean;
  smsCall: boolean;
};

export type LeadWorkspaceOverlay = {
  planName?: string;
  planCode?: string;
  billingCycle?: string;
  price?: number;
  trialDaysLeft?: number | null;
  onboardingComplete?: boolean;
  accountReady?: boolean;
};

export type OnboardedMonitorFlag =
  | "journey_inactive_day8"
  | "recommend_move_to_cold"
  | "subscription_expiring_soon"
  | "subscription_grace_period"
  | "subscription_renew"
  | "subscription_change";

export type OnboardedJourneyPhase =
  | "day1_7"
  | "day8_14"
  | "day15_plus"
  | "graduated";

export type OnboardedMonitor = {
  journeyDay: number;
  journeyPhase: OnboardedJourneyPhase;
  isActive: boolean;
  gettingStartedCompleted: number;
  activityDayCount: number;
  onboardedAt: string | null;
  flags: OnboardedMonitorFlag[];
  subscription?: {
    status?: string;
    expiresAt?: string | null;
    changeType?: string | null;
  };
};

export type Lead = {
  id: string;
  userId: string;
  businessName: string;
  ownerName: string;
  email?: string;
  phone?: string;
  address?: string;
  stage: LeadStage;
  /** @deprecated Prefer warmAttemptCount + coldAttemptCount; kept as warm+cold total. */
  attemptCount: number;
  /** Contact attempts counted on the warm track (archive at 8). */
  warmAttemptCount?: number;
  /** Contact attempts counted on the cold track (archive at 3). */
  coldAttemptCount?: number;
  assignedToUid?: string;
  firstContactAt?: string | null;
  lastContactAt?: string | null;
  /** Sales account who made the latest contact. */
  lastContactedByUid?: string;
  nextFollowUpAt?: string | null;
  attendedDemo?:
    | "attended"
    | "missed"
    | "not_needed"
    | "not_applicable"
    | null;
  warmStatus?: string;
  stallReason?: string;
  channels: LeadChannels;
  leadSource?: string;
  /** Which website when leadSource is Website. */
  sourceWebsite?: string;
  /** Who referred when leadSource is Referrals (display label). */
  referredBy?: string;
  /** CRM client id when referral is linked to an account/business. */
  referredByClientId?: string;
  /** Platform user id when referral is linked to a directory account. */
  referredByUserId?: string;
  /** Catalog affiliate document id when the referrer has a partner code. */
  referredByAffiliateId?: string;
  /** Catalog affiliate code when the referrer has a partner code. */
  referredByAffiliateCode?: string;
  notes?: string;
  linkedBusinessId?: string;
  sourceKind?: "inquiry" | "demo_request" | "business_inquiry" | "manual" | "content";
  platformSource?: LeadPlatformSource;
  /** Role on that platform (e.g. owner, staff, registered, prospect). */
  platformRole?: string;
  accountReady?: boolean;
  dataImported?: "yes" | "no" | "in_progress";
  trainingPhase?: "phase_1" | "phase_2";
  /** When the prospect inquired / requested a demo. */
  inquiredAt?: string | null;
  /** When the account was registered. */
  registeredAt?: string | null;
  /** Total customers on the account when known. */
  customerCount?: number;
  /** Latest Brevo transactional message id from follow-up email. */
  lastOutreachMessageId?: string;
  /** When Brevo reported the follow-up email was opened. */
  lastOutreachOpenedAt?: string | null;
  /** Journey start for onboarded monitor (from workspace). */
  onboardedAt?: string | null;
  gettingStartedCompleted?: number;
  activityDayCount?: number;
  lastActiveDay?: string | null;
  /** Firebase Auth last sign-in time for the workspace owner. */
  lastSignInAt?: string | null;
  subscriptionStatus?: string | null;
  subscriptionExpiresAt?: string | null;
  subscriptionChangeType?: string | null;
  /** Webinar / training / article / story activity (Content leads tab). */
  contentSources?: Array<"webinar" | "training" | "article" | "story">;
  contentSummary?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  workspace?: LeadWorkspaceOverlay;
  /** Computed Day 1–15 + subscription monitor (onboarded queue). */
  onboardedMonitor?: OnboardedMonitor;
};

export type LeadHistoryKind =
  | "created"
  | "tracking_started"
  | "details"
  | "status";

export type LeadHistoryChange = {
  field: string;
  from: string | null;
  to: string | null;
};

export type LeadHistoryEvent = {
  id: string;
  type: "created" | "updated";
  kind?: LeadHistoryKind;
  summary: string;
  changes: LeadHistoryChange[];
  snapshot?: Record<string, string | null>;
  actorUid: string;
  createdAt?: string | null;
};

export type LeadAnalytics = {
  funnel: Array<{ stage: LeadStage; count: number }>;
  bySource: Array<{ name: string; count: number }>;
  byAssignee: Array<{
    assignedToUid: string;
    count: number;
    overdueFollowUps: number;
  }>;
  queueCounts: Record<LeadQueue, number>;
  trialRisk: {
    daysLeftZero: number;
    daysLeftLte3: number;
  };
  stallReasons: Array<{ name: string; count: number }>;
};
