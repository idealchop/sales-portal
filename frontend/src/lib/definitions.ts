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
