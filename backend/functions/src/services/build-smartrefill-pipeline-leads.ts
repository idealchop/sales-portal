import { getFirestore } from "firebase-admin/firestore";
import type { UserRecord } from "firebase-admin/auth";
import { app, auth, db } from "../config/firebase-admin";
import { SMARTREFILL_APP_ID } from "../constants/smartrefill";
import {
  extractRiverUserProfile,
  getSalesPortalAccess,
} from "./sales-portal-access";
import { toIsoString } from "./sales-serializer";
import {
  fetchLegacySmartRefillLeads,
  fetchLegacyStationsForPipeline,
  type LegacySmartRefillStation,
} from "./legacy-smartrefill-analytics-service";
import {
  applyContentTouchesToPipeline,
  loadContentPipelineTouches,
} from "./content-pipeline-leads";
import type {
  LeadChannels,
  LeadPlatformSource,
  LeadRecord,
  LeadStage,
  LeadSourceKind,
} from "./leads-service";

const EMPTY_CHANNELS: LeadChannels = {
  viber: false,
  email: false,
  messenger: false,
  smsCall: false,
};

const AUTH_WARM_LEAD_CAP = 5000;

type PipelineBundle = {
  leads: LeadRecord[];
  sales: SalesExclusionSets;
};

export type SalesExclusionSets = {
  uids: Set<string>;
  emails: Set<string>;
};

/**
 * Always prefer prod `riverdb` for pipeline population so Dev/local still
 * surface real SmartRefill owners. Override with SALES_PORTAL_PIPELINE_FIRESTORE_DB.
 */
function pipelineBusinessesDb() {
  const databaseId =
    process.env.SALES_PORTAL_PIPELINE_FIRESTORE_DB?.trim() || "riverdb";
  return getFirestore(app, databaseId);
}

function displayName(data: Record<string, unknown>): string {
  for (const key of ["ownerName", "fullName", "displayName", "name"] as const) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  if (typeof data.email === "string" && data.email.trim()) {
    return data.email.trim();
  }
  return "Owner";
}

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === "true";
}

function normalizeEmail(value?: string | null): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

export function hasActiveSmartRefillAccess(appAccess: unknown): boolean {
  if (!Array.isArray(appAccess)) return false;
  return appAccess.some((row) => {
    if (!row || typeof row !== "object") return false;
    const entry = row as { appId?: string; accessRevoked?: boolean };
    return (
      String(entry.appId || "") === SMARTREFILL_APP_ID &&
      entry.accessRevoked !== true
    );
  });
}

function smartRefillAccessRole(appAccess: unknown): "owner" | "staff" | null {
  if (!Array.isArray(appAccess)) return null;
  const entry = appAccess.find((row) => {
    if (!row || typeof row !== "object") return false;
    const item = row as { appId?: string; accessRevoked?: boolean };
    return (
      String(item.appId || "") === SMARTREFILL_APP_ID &&
      item.accessRevoked !== true
    );
  }) as { role?: string } | undefined;
  if (!entry || typeof entry.role !== "string") return null;
  const role = entry.role.trim().toLowerCase();
  if (role === "owner") return "owner";
  // admin / rider / staff → Staff (SmartRefill assignable roles).
  if (role === "staff" || role === "admin" || role === "rider") return "staff";
  return null;
}

/**
 * Platform role labels:
 * - SmartRefill → Owner | Staff
 * - SmartRefill legacy → Owner (assumed for now)
 * - Inquire/demo → Prospect
 * - Auth sign-up not in SmartRefill yet → Registered
 */
export function resolveLeadPlatformRole(input: {
  platformSource?: LeadPlatformSource;
  sourceKind?: LeadSourceKind;
  leadSource?: string;
  isBusinessOwner?: boolean;
  appAccess?: unknown;
}): string {
  if (
    input.sourceKind === "inquiry" ||
    input.sourceKind === "demo_request" ||
    input.sourceKind === "business_inquiry"
  ) {
    return "Prospect";
  }
  if (input.sourceKind === "content") {
    return "Content";
  }

  // Legacy stations/accounts: treat everyone as Owner for now.
  if (
    input.platformSource === "smartrefill_legacy" ||
    input.leadSource === "SmartRefill legacy station"
  ) {
    return "Owner";
  }

  const accessRole = smartRefillAccessRole(input.appAccess);
  if (accessRole === "owner") return "Owner";
  if (accessRole === "staff") return "Staff";
  if (input.isBusinessOwner) return "Owner";
  if (input.leadSource === "Registered account") return "Registered";
  if (input.leadSource === "SmartRefill workspace") return "Owner";
  return "—";
}

function kindToSourceKind(kind: string): LeadSourceKind {
  if (kind === "demo_request") return "demo_request";
  if (kind === "business_inquiry") return "business_inquiry";
  return "inquiry";
}

function kindToStage(kind: string): LeadStage {
  if (kind === "demo_request") return "warm";
  return "inquire";
}

/**
 * Legacy stations never land in Onboarded — that queue is SmartRefill
 * (`riverdb`) only. Contacted/ignored keep Cold/Archives; everyone else is Warm.
 */
export function stageFromLegacyStation(
  station: Pick<LegacySmartRefillStation, "triageStatus">,
): LeadStage {
  if (station.triageStatus === "ignored") return "archive";
  if (station.triageStatus === "contacted") return "cold";
  return "registered";
}

/**
 * Onboarded = SmartRefill workspace with onboarding done.
 * Inquire / demo always stay Warm-queue stages.
 * Registered Auth / incomplete workspaces stay Warm (`registered`).
 * Cold/Archives overlays from CRM still win for follow-up queues.
 */
export function resolvePipelineStage(input: {
  platformSource?: LeadPlatformSource;
  onboardingComplete?: boolean;
  overlayStage?: LeadStage;
  baseStage: LeadStage;
}): LeadStage {
  const overlay = input.overlayStage;
  if (overlay === "cold" || overlay === "archive") return overlay;

  // Inquire / demo requests always remain Warm (never forced onboarded).
  if (input.baseStage === "inquire" || input.baseStage === "warm") {
    if (
      overlay === "inquire" ||
      overlay === "warm" ||
      overlay === "registered"
    ) {
      return overlay;
    }
    return input.baseStage;
  }

  const isSmartRefill = input.platformSource === "smartrefill";
  if (isSmartRefill && input.onboardingComplete) return "onboarded";
  if (isSmartRefill) return "registered";

  // Legacy stations / CRM-only: never onboarded.
  if (overlay === "onboarded") return "registered";
  if (
    overlay === "inquire" ||
    overlay === "warm" ||
    overlay === "registered"
  ) {
    return overlay;
  }
  if (input.baseStage === "onboarded") return "registered";
  return input.baseStage;
}

/** Auth users without SmartRefill membership become Warm SmartRefill leads. */
export function shouldIncludeAuthUserAsWarmLead(input: {
  uid: string;
  email?: string | null;
  hasSmartRefillAccess: boolean;
  isBusinessOwner: boolean;
  sales: SalesExclusionSets;
  coveredEmails: Set<string>;
}): boolean {
  if (input.sales.uids.has(input.uid)) return false;
  const email = normalizeEmail(input.email);
  if (email && input.sales.emails.has(email)) return false;
  if (input.hasSmartRefillAccess) return false;
  if (input.isBusinessOwner) return false;
  if (email && input.coveredEmails.has(email)) return false;
  return true;
}

export function isSalesConnectedLead(
  lead: Pick<LeadRecord, "userId" | "email">,
  sales: SalesExclusionSets,
): boolean {
  if (lead.userId && sales.uids.has(lead.userId)) return true;
  const email = normalizeEmail(lead.email);
  if (email && sales.emails.has(email)) return true;
  return false;
}

export function excludeSalesConnectedLeads(
  leads: LeadRecord[],
  sales: SalesExclusionSets,
): LeadRecord[] {
  return leads.filter((lead) => !isSalesConnectedLead(lead, sales));
}

function toLeadFromLegacy(input: {
  id: string;
  kind: "inquiry" | "demo_request" | "business_inquiry";
  name: string;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  subtitle: string;
  status: string | null;
  occurredAt: string | null;
}): LeadRecord {
  const externalId = `sr-legacy:${input.kind}:${input.id}`;
  return {
    id: externalId,
    userId: "smartrefill",
    businessName: input.businessName || input.name || "Untitled",
    ownerName: input.name,
    email: input.email || undefined,
    phone: input.phone || undefined,
    stage: kindToStage(input.kind),
    attemptCount: 0,
    warmAttemptCount: 0,
    coldAttemptCount: 0,
    channels: { ...EMPTY_CHANNELS },
    leadSource:
      input.kind === "demo_request" ? "Demo request" :
        input.kind === "business_inquiry" ? "Business inquiry" :
          "Inquiry",
    notes: input.subtitle,
    warmStatus: input.status || undefined,
    sourceKind: kindToSourceKind(input.kind),
    // Product inquire/demo for SmartRefill — Warm queue, SmartRefill platform.
    platformSource: "smartrefill",
    platformRole: resolveLeadPlatformRole({
      platformSource: "smartrefill",
      sourceKind: kindToSourceKind(input.kind),
    }),
    firstContactAt: input.occurredAt,
    lastContactAt: input.occurredAt,
    inquiredAt: input.occurredAt,
    createdAt: input.occurredAt,
    updatedAt: input.occurredAt,
    createdByUid: "smartrefill",
  };
}

function optionalCustomerCount(data: Record<string, unknown>): number | undefined {
  for (const key of ["customerCount", "customersCount", "totalCustomers"] as const) {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return Math.floor(value);
    }
  }
  return undefined;
}

function toLeadFromLegacyStation(station: LegacySmartRefillStation): LeadRecord {
  return {
    id: `sr-legacy:station:${station.id}`,
    userId: station.id,
    businessName: station.businessName || "Legacy station",
    ownerName: station.ownerName || "Owner",
    email: station.email || undefined,
    phone: station.phone || undefined,
    address: station.address || undefined,
    stage: stageFromLegacyStation(station),
    attemptCount: station.triageStatus === "contacted" ? 1 : 0,
    warmAttemptCount: station.triageStatus === "contacted" ? 1 : 0,
    coldAttemptCount: 0,
    channels: { ...EMPTY_CHANNELS },
    leadSource: "SmartRefill legacy station",
    sourceKind: "manual",
    platformSource: "smartrefill_legacy",
    platformRole: resolveLeadPlatformRole({
      platformSource: "smartrefill_legacy",
      leadSource: "SmartRefill legacy station",
    }),
    accountReady: station.onboardingComplete,
    customerCount: station.customerCount,
    lastContactAt: station.contactedAt,
    registeredAt: station.lastSignedInAt,
    createdAt: station.lastSignedInAt,
    updatedAt: station.contactedAt || station.lastSignedInAt,
    createdByUid: "smartrefill",
    workspace: {
      onboardingComplete: station.onboardingComplete,
      accountReady: station.onboardingComplete,
    },
  };
}

function toLeadFromAuthUser(
  authUser: UserRecord,
  firestoreData?: Record<string, unknown>,
): LeadRecord {
  const profile = extractRiverUserProfile(firestoreData);
  const email =
    profile.email ||
    (typeof authUser.email === "string" ? authUser.email.trim() : "") ||
    undefined;
  const ownerName =
    profile.displayName ||
    authUser.displayName?.trim() ||
    email ||
    "Registered user";
  const phone =
    profile.phone ||
    (typeof authUser.phoneNumber === "string" ?
      authUser.phoneNumber.trim() :
      undefined) ||
    undefined;
  const createdAt =
    authUser.metadata.creationTime ?
      new Date(authUser.metadata.creationTime).toISOString() :
      null;

  return {
    id: `sr-auth:${authUser.uid}`,
    userId: authUser.uid,
    businessName: ownerName,
    ownerName,
    email,
    phone,
    stage: "registered",
    attemptCount: 0,
    warmAttemptCount: 0,
    coldAttemptCount: 0,
    channels: { ...EMPTY_CHANNELS },
    leadSource: "Registered account",
    sourceKind: "manual",
    platformSource: "smartrefill",
    platformRole: resolveLeadPlatformRole({
      platformSource: "smartrefill",
      leadSource: "Registered account",
      appAccess: firestoreData?.appAccess,
    }),
    accountReady: false,
    registeredAt: createdAt,
    createdAt,
    updatedAt: createdAt,
    createdByUid: "smartrefill",
    workspace: {
      onboardingComplete: false,
      accountReady: false,
    },
  };
}

async function listAuthUsers(maxUsers: number): Promise<UserRecord[]> {
  const users: UserRecord[] = [];
  let pageToken: string | undefined;
  while (users.length < maxUsers) {
    const batchSize = Math.min(1000, maxUsers - users.length);
    const result = await auth.listUsers(batchSize, pageToken);
    users.push(...result.users);
    if (!result.pageToken) break;
    pageToken = result.pageToken;
  }
  return users;
}

function addSalesExclusionFromUserDoc(
  sales: SalesExclusionSets,
  uid: string,
  data: Record<string, unknown>,
) {
  if (!getSalesPortalAccess(data.appAccess)) return;
  sales.uids.add(uid);
  const profile = extractRiverUserProfile(data);
  const email = normalizeEmail(profile.email);
  if (email) sales.emails.add(email);
}

export async function loadSalesExclusionSets(options?: {
  pipelineUsersByUid?: Map<string, Record<string, unknown>>;
}): Promise<SalesExclusionSets> {
  const sales: SalesExclusionSets = {
    uids: new Set(),
    emails: new Set(),
  };
  const pipelineDb = pipelineBusinessesDb();
  const [portalUsersSnap, salesSnap, pipelineUsersSnap] = await Promise.all([
    db.collection("users").get(),
    db.collection("sales").get(),
    options?.pipelineUsersByUid ?
      Promise.resolve(null) :
      pipelineDb.collection("users").get(),
  ]);

  for (const doc of portalUsersSnap.docs) {
    addSalesExclusionFromUserDoc(
      sales,
      doc.id,
      (doc.data() ?? {}) as Record<string, unknown>,
    );
  }
  if (options?.pipelineUsersByUid) {
    for (const [uid, data] of options.pipelineUsersByUid) {
      addSalesExclusionFromUserDoc(sales, uid, data);
    }
  } else if (pipelineUsersSnap) {
    for (const doc of pipelineUsersSnap.docs) {
      addSalesExclusionFromUserDoc(
        sales,
        doc.id,
        (doc.data() ?? {}) as Record<string, unknown>,
      );
    }
  }
  for (const doc of salesSnap.docs) {
    sales.uids.add(doc.id);
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    const email = normalizeEmail(
      typeof data.email === "string" ? data.email : null,
    );
    if (email) sales.emails.add(email);
  }

  return sales;
}

function loadRiverdbBusinessLeadsFromSnap(
  snap: FirebaseFirestore.QuerySnapshot,
  usersByUid?: Map<string, Record<string, unknown>>,
): LeadRecord[] {
  const leads: LeadRecord[] = [];

  for (const doc of snap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    const onboardingComplete = isTruthyFlag(data.onboardingComplete);
    const stage: LeadStage = onboardingComplete ? "onboarded" : "registered";
    const name = String(data.name || "").trim() || "Unnamed business";
    const ownerEmail =
      typeof data.ownerEmail === "string" ? data.ownerEmail.trim() :
        typeof data.email === "string" ? data.email.trim() :
          "";
    const ownerId =
      typeof data.ownerId === "string" ? data.ownerId.trim() : undefined;
    const createdAt = toIsoString(data.createdAt);
    const planName =
      typeof data.planName === "string" && data.planName.trim() ?
        data.planName.trim() :
        undefined;
    const ownerUser = ownerId ? usersByUid?.get(ownerId) : undefined;

    leads.push({
      id: `sr-business:${doc.id}`,
      userId: ownerId || "smartrefill",
      businessName: name,
      ownerName: displayName(data),
      email: ownerEmail || undefined,
      phone:
        typeof data.phone === "string" && data.phone.trim() ?
          data.phone.trim() :
          undefined,
      address:
        typeof data.address === "string" && data.address.trim() ?
          data.address.trim() :
          undefined,
      stage,
      attemptCount: 0,
      warmAttemptCount: 0,
      coldAttemptCount: 0,
      channels: { ...EMPTY_CHANNELS },
      leadSource: "SmartRefill workspace",
      sourceKind: "manual",
      platformSource: "smartrefill",
      platformRole: resolveLeadPlatformRole({
        platformSource: "smartrefill",
        leadSource: "SmartRefill workspace",
        isBusinessOwner: true,
        appAccess: ownerUser?.appAccess,
      }),
      linkedBusinessId: doc.id,
      accountReady: onboardingComplete,
      customerCount: optionalCustomerCount(data),
      registeredAt: createdAt,
      createdAt,
      updatedAt: createdAt,
      createdByUid: "smartrefill",
      workspace: {
        planName,
        onboardingComplete,
        accountReady: onboardingComplete,
      },
    });
  }

  return leads;
}

async function loadAuthWarmLeads(input: {
  sales: SalesExclusionSets;
  businessOwnerIds: Set<string>;
  coveredEmails: Set<string>;
  usersByUid: Map<string, Record<string, unknown>>;
  authUsers: UserRecord[];
}): Promise<LeadRecord[]> {
  const leads: LeadRecord[] = [];
  for (const authUser of input.authUsers) {
    const fsData = input.usersByUid.get(authUser.uid);
    const profile = extractRiverUserProfile(fsData);
    const email =
      profile.email ||
      (typeof authUser.email === "string" ? authUser.email : null);
    if (
      !shouldIncludeAuthUserAsWarmLead({
        uid: authUser.uid,
        email,
        hasSmartRefillAccess: hasActiveSmartRefillAccess(fsData?.appAccess),
        isBusinessOwner: input.businessOwnerIds.has(authUser.uid),
        sales: input.sales,
        coveredEmails: input.coveredEmails,
      })
    ) {
      continue;
    }
    leads.push(toLeadFromAuthUser(authUser, fsData));
  }
  return leads;
}

/**
 * Build pipeline rows from both SmartRefill databases plus Auth sign-ups:
 * - `smartrefill` → riverdb businesses, Auth users not yet in SmartRefill, inquire/demo
 * - `smartrefill_legacy` → prod-smartrefill stations
 * Sales Portal accounts are excluded entirely.
 */
export async function buildSmartRefillPipelineBundle(): Promise<PipelineBundle> {
  const pipelineDb = pipelineBusinessesDb();
  const [
    legacyInquires,
    legacyStations,
    usersSnap,
    authUsers,
    portalUsersSnap,
    salesSnap,
    businessesSnap,
  ] = await Promise.all([
    fetchLegacySmartRefillLeads(),
    fetchLegacyStationsForPipeline(),
    pipelineDb.collection("users").get(),
    listAuthUsers(AUTH_WARM_LEAD_CAP),
    db.collection("users").get(),
    db.collection("sales").get(),
    pipelineDb.collection("businesses").get(),
  ]);

  const usersByUid = new Map(
    usersSnap.docs.map((doc) => [
      doc.id,
      (doc.data() ?? {}) as Record<string, unknown>,
    ]),
  );

  const sales: SalesExclusionSets = {
    uids: new Set(),
    emails: new Set(),
  };
  for (const doc of portalUsersSnap.docs) {
    addSalesExclusionFromUserDoc(
      sales,
      doc.id,
      (doc.data() ?? {}) as Record<string, unknown>,
    );
  }
  for (const [uid, data] of usersByUid) {
    addSalesExclusionFromUserDoc(sales, uid, data);
  }
  for (const doc of salesSnap.docs) {
    sales.uids.add(doc.id);
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    const email = normalizeEmail(
      typeof data.email === "string" ? data.email : null,
    );
    if (email) sales.emails.add(email);
  }

  const businesses = loadRiverdbBusinessLeadsFromSnap(businessesSnap, usersByUid);

  const fromInquire = legacyInquires.leads.map(toLeadFromLegacy);
  const fromStations = legacyStations.map(toLeadFromLegacyStation);

  const businessOwnerIds = new Set(
    businesses
      .map((lead) => lead.userId)
      .filter((uid) => uid && uid !== "smartrefill"),
  );
  const coveredEmails = new Set<string>();
  for (const lead of [...fromInquire, ...businesses]) {
    const email = normalizeEmail(lead.email);
    if (email) coveredEmails.add(email);
  }

  const fromAuth = await loadAuthWarmLeads({
    sales,
    businessOwnerIds,
    coveredEmails,
    usersByUid,
    authUsers,
  });

  const contentTouches = await loadContentPipelineTouches(
    pipelineDb,
    usersByUid,
  );
  const withContent = applyContentTouchesToPipeline(
    [...fromInquire, ...fromStations, ...businesses, ...fromAuth],
    contentTouches,
  );

  const bundle: PipelineBundle = {
    leads: withContent,
    sales,
  };
  return bundle;
}

export async function buildSmartRefillPipelineLeads(): Promise<LeadRecord[]> {
  const bundle = await buildSmartRefillPipelineBundle();
  return bundle.leads;
}

/** CRM overlays keyed by external SmartRefill id (or CRM doc id). */
export function mergeCrmOverlays(
  smartRefillLeads: LeadRecord[],
  crmLeads: LeadRecord[],
): LeadRecord[] {
  const byExternal = new Map<string, LeadRecord>();
  const byBusiness = new Map<string, LeadRecord>();
  const byEmail = new Map<string, LeadRecord>();

  for (const lead of crmLeads) {
    byExternal.set(lead.id, lead);
    if (lead.linkedBusinessId) byBusiness.set(lead.linkedBusinessId, lead);
    if (lead.email) byEmail.set(lead.email.toLowerCase(), lead);
  }

  const merged = smartRefillLeads.map((lead) => {
    const overlay =
      byExternal.get(lead.id) ||
      (lead.linkedBusinessId ?
        byBusiness.get(lead.linkedBusinessId) :
        undefined) ||
      (lead.email ? byEmail.get(lead.email.toLowerCase()) : undefined);
    if (!overlay) {
      return {
        ...lead,
        stage: resolvePipelineStage({
          platformSource: lead.platformSource,
          onboardingComplete: lead.workspace?.onboardingComplete,
          baseStage: lead.stage,
        }),
      };
    }
    return {
      ...lead,
      stage: resolvePipelineStage({
        platformSource: lead.platformSource,
        onboardingComplete: lead.workspace?.onboardingComplete,
        overlayStage: overlay.stage,
        baseStage: lead.stage,
      }),
      attemptCount: overlay.attemptCount,
      assignedToUids:
        overlay.assignedToUids?.length ?
          overlay.assignedToUids :
          overlay.assignedToUid ?
            [overlay.assignedToUid] :
            lead.assignedToUids,
      assignedToUid: overlay.assignedToUid || lead.assignedToUid,
      notes: overlay.notes || lead.notes,
      stallReason: overlay.stallReason || lead.stallReason,
      warmStatus: overlay.warmStatus || lead.warmStatus,
      channels: overlay.channels || lead.channels,
      nextFollowUpAt: overlay.nextFollowUpAt ?? lead.nextFollowUpAt,
      lastContactAt: overlay.lastContactAt ?? lead.lastContactAt,
      lastContactedByUid:
        overlay.lastContactedByUid || lead.lastContactedByUid,
      attendedDemo: overlay.attendedDemo ?? lead.attendedDemo,
      accountReady: overlay.accountReady ?? lead.accountReady,
      leadSource: overlay.leadSource || lead.leadSource,
      sourceWebsite: overlay.sourceWebsite || lead.sourceWebsite,
      referredBy: overlay.referredBy || lead.referredBy,
      referredByClientId:
        overlay.referredByClientId || lead.referredByClientId,
      referredByUserId: overlay.referredByUserId || lead.referredByUserId,
      inquiredAt: overlay.inquiredAt ?? lead.inquiredAt,
      registeredAt: overlay.registeredAt ?? lead.registeredAt,
      dataImported: overlay.dataImported ?? lead.dataImported,
      trainingPhase: overlay.trainingPhase ?? lead.trainingPhase,
      workspace: lead.workspace || overlay.workspace,
      // Keep origin DB label from SmartRefill row (never overwrite with CRM).
      platformSource: lead.platformSource,
    };
  });

  const coveredBusinesses = new Set(
    merged
      .map((lead) => lead.linkedBusinessId)
      .filter((id): id is string => Boolean(id)),
  );
  const coveredEmails = new Set(
    merged
      .map((lead) => lead.email?.toLowerCase())
      .filter((email): email is string => Boolean(email)),
  );

  for (const crm of crmLeads) {
    if (crm.linkedBusinessId && coveredBusinesses.has(crm.linkedBusinessId)) {
      continue;
    }
    if (crm.email && coveredEmails.has(crm.email.toLowerCase())) continue;
    if (crm.id.startsWith("sr-")) continue;
    const platformSource =
      crm.platformSource ?? ("smartrefill" as LeadPlatformSource);
    merged.push({
      ...crm,
      platformSource,
      stage: resolvePipelineStage({
        platformSource,
        onboardingComplete: crm.workspace?.onboardingComplete,
        baseStage: crm.stage,
      }),
    });
  }

  return merged;
}

export function crmLeadsCollection() {
  return db.collection("leads");
}
