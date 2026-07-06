import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase-admin";
import { SMARTREFILL_APP_ID } from "../constants/smartrefill";
import { parseUserAgent } from "./parse-user-agent";
import {
  computeAppFeedback,
  mapPlatformFeedbackDoc,
  mapWorkspaceFeedback,
  type AppFeedbackSummary,
} from "./compute-app-feedback";
import { computeBehavioralSalesMetrics } from "./compute-behavioral-sales-metrics";
import type { AiSalesInsightsResult } from "./generate-ai-sales-insights";
import {
  generateDashboardForecasts,
  type DashboardForecasts,
} from "./generate-dashboard-forecasts";
import {
  computeGrowthSalesMetrics,
  type GrowthSalesMetrics,
} from "./compute-growth-sales-metrics";
import {
  createRoleActiveTimeBuckets,
  minutesOfDayInTimezone,
  recordRoleActiveTime,
  summarizeRoleActiveTimes,
} from "./compute-role-active-times";
import { countActiveUsersByRole, countSmartRefillUserRoles, filterOwnerSmartRefillUsers, resolveSmartRefillUserRole } from "./count-smartrefill-user-roles";
import {
  collectTestAccountOwnerIds,
  isTestAccountOwnerId,
  readFirestoreAuthAccountTag,
} from "./auth-account-tag";
import {
  computeProposalPipeline,
  computeSalesInsights,
  countGettingStartedDone,
  type BusinessSnapshot,
  type ProposalPipeline,
  type SalesInsights,
} from "./compute-sales-insights";
import { classifyHealthForSnapshot } from "./compute-sales-insights-helpers";
import { mapOwnerSubscriptions } from "./map-owner-subscriptions";
import {
  buildDailyCountSeries,
  buildLoginDailySeries,
  buildTransactionDailySeries,
  flattenDailyUsage,
  CHART_SERIES_DAYS,
  type ChartBusinessContext,
  type ChartTimeSeries,
} from "./build-chart-time-series";
import { mapWithConcurrency } from "../utils/map-with-concurrency";
import { buildNewJoiners, type NewJoinersSummary } from "./build-new-joiners";
import { buildPlatformAlerts, type PlatformAlertsSummary } from "./build-platform-alerts";
import {
  attachContactStatusToAlerts,
  getPlatformAlertContactStatuses,
} from "./platform-alert-contacts-service";
import {
  computeCommunityDispatchMetrics,
  loadPendingCommunityOfferCounts,
  type CommunityDispatchMetrics,
} from "./community-dispatch-ops-service";
import {
  readPlatformCommunityChannelUsage,
  aggregateStationCommunityAccepts,
  type CommunityChannelUsageBilling,
} from "./community-channel-usage-service";
import {
  aggregatePlatformInventory,
  classifyBusinessTier,
  countVirtualStaffRecords,
  emptyBusinessTierCounts,
  emptyTransactionBreakdown,
  sumInventoryBreakdown,
  type BusinessTierCounts,
  type CustomerStatusBreakdown,
  type InventoryBreakdown,
  type TransactionBreakdown,
  type VirtualStaffCounts,
} from "./compute-platform-kpi-breakdowns";
import type { SmartRefillUserRoleCounts } from "./count-smartrefill-user-roles";

const BUSINESS_QUERY_CONCURRENCY = 20;
const LOGIN_EVENT_QUERY_CONCURRENCY = 25;

export { SMARTREFILL_APP_ID } from "../constants/smartrefill";

const GETTING_STARTED_FEATURES = [
  "addCustomer",
  "addInventory",
  "addDelivery",
  "addWalkin",
  "addExpense",
  "addCollection",
  "useAi",
  "addPaymentAccount",
  "verifyEmail",
] as const;

export type DashboardAnalytics = {
  summary: {
    smartRefillUsers: number;
    onboardedBusinesses: number;
    totalBusinesses: number;
    totalCustomers: number;
    activeLoginUsers: number;
    loginSessionsLast30Days: number;
    topDevice: string;
    topBrowser: string;
    transactionsLast30Days: number;
    refillVolumeLast30Days: number;
    totalTransactions: number;
    transactionBreakdown: TransactionBreakdown;
    customerBreakdown: CustomerStatusBreakdown;
    userRoleCounts: Pick<SmartRefillUserRoleCounts, "owners" | "admins" | "riders">;
    virtualStaffCounts: VirtualStaffCounts;
    businessTierCounts: BusinessTierCounts;
    totalInventory: number;
    inventoryBreakdown: InventoryBreakdown;
  };
  userGrowth: { month: string; count: number }[];
  businessGrowth: { month: string; count: number }[];
  dailyActiveUsers: { date: string; sessions: number; uniqueUsers: number }[];
  deviceUsage: { name: string; sessions: number; uniqueUsers: number }[];
  browserUsage: { name: string; sessions: number; uniqueUsers: number }[];
  planDistribution: { name: string; count: number }[];
  usageGoals: { goal: string; count: number }[];
  featureAdoption: { feature: string; rate: number; completed: number; total: number }[];
  transactionVolume: { month: string; count: number; amount: number }[];
  recentBusinesses: {
    id: string;
    name: string;
    ownerEmail?: string;
    createdAt: string | null;
    onboardingComplete: boolean;
    planName?: string;
  }[];
  topBusinessesByCustomers: {
    id: string;
    name: string;
    customers: number;
  }[];
  businessLocations: {
    id: string;
    name: string;
    ownerEmail?: string;
    ownerId?: string;
    lat: number;
    lng: number;
    address?: string;
    onboardingComplete: boolean;
    planName?: string;
    planCode?: string;
    billingCycle?: string;
    healthTier: "high" | "medium" | "low";
    customers: number;
    transactionsLast30Days: number;
    lastActiveDay?: string;
    communityDispatchEnabled?: boolean;
    communityPublicName?: string;
    pendingCommunityOffers?: number;
    authAccountTag?: "test" | null;
  }[];
  communityDispatchMetrics: CommunityDispatchMetrics;
  communityChannelUsage: CommunityChannelUsageBilling;
  salesInsights: SalesInsights;
  proposalPipeline: ProposalPipeline;
  appFeedback: AppFeedbackSummary;
  growthSalesMetrics: GrowthSalesMetrics;
  chartTimeSeries: ChartTimeSeries;
  chartBusinessContext: ChartBusinessContext[];
  aiSalesInsights: AiSalesInsightsResult;
  dashboardForecasts: DashboardForecasts;
  newJoiners: NewJoinersSummary;
  platformAlerts: PlatformAlertsSummary;
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as Timestamp).toDate();
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    return new Date((value as { _seconds: number })._seconds * 1000);
  }
  return null;
}

function monthKey(date: Date): string {
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === "true";
}

function parseBusinessCoordinates(
  location: unknown,
): { lat: number; lng: number; address?: string } | null {
  if (!location || typeof location !== "object") return null;
  const loc = location as Record<string, unknown>;
  const lat = Number(loc.lat);
  const lng = Number(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    lat,
    lng,
    address: typeof loc.address === "string" ? loc.address : undefined,
  };
}

function hasSmartRefillAccess(appAccess: unknown): boolean {
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

function buildMonthlySeries(
  dates: Date[],
  monthsBack = 6,
): { month: string; count: number }[] {
  const now = new Date();
  const buckets = new Map<string, number>();
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(monthKey(d), 0);
  }
  dates.forEach((date) => {
    const key = monthKey(date);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
  });
  return [...buckets.entries()].map(([month, count]) => ({ month, count }));
}

export async function fetchDashboardAnalytics(): Promise<DashboardAnalytics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDayKey = dayKey(thirtyDaysAgo);
  const chartWindowStart = new Date(now);
  chartWindowStart.setDate(chartWindowStart.getDate() - (CHART_SERIES_DAYS - 1));
  const chartWindowKey = dayKey(chartWindowStart);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    usersSnap,
    businessesSnap,
    ridersSnap,
    inventoryItemsSnap,
    inquiriesSnap,
    proposalsSnap,
    clientsSnap,
    appsFeedbackSnap,
    salesSnap,
    pendingCommunityOffers,
    communityDispatchMetrics,
    platformChannelUsage,
  ] = await Promise.all([
    db.collection("users").get(),
    db.collection("businesses").get(),
    db.collectionGroup("riders").get(),
    db.collectionGroup("inventory_items").get(),
    db.collection("inquiries").orderBy("createdAt", "desc").limit(50).get(),
    db.collection("proposals").get(),
    db.collection("clients").get(),
    db.collection("apps_feedback").get(),
    db.collection("sales").get(),
    loadPendingCommunityOfferCounts(),
    computeCommunityDispatchMetrics(),
    readPlatformCommunityChannelUsage(),
  ]);

  const communityChannelUsage: CommunityChannelUsageBilling = {
    ...platformChannelUsage,
    ...aggregateStationCommunityAccepts(
      businessesSnap.docs,
      platformChannelUsage.periodKey,
    ),
  };

  const smartRefillUsers = usersSnap.docs.filter((doc) =>
    hasSmartRefillAccess(doc.data().appAccess),
  );

  const businessDocs = businessesSnap.docs;
  const businessOwnerIds = new Set(
    businessDocs
      .map((doc) => doc.data().ownerId)
      .filter((ownerId): ownerId is string => typeof ownerId === "string"),
  );
  const userDocs = usersSnap.docs.map((doc) => ({
    id: doc.id,
    data: doc.data(),
  }));
  const testAccountOwnerIds = collectTestAccountOwnerIds(userDocs);
  const authAccountTagByUserId = new Map(
    userDocs.map((doc) => [doc.id, readFirestoreAuthAccountTag(doc.data)]),
  );

  const ownerSmartRefillUsers = filterOwnerSmartRefillUsers(
    smartRefillUsers.map((doc) => ({ id: doc.id, data: doc.data() })),
    businessOwnerIds,
  );

  const ownerUserGrowthDates = ownerSmartRefillUsers
    .map(({ data }) => toDate(data.createdAt))
    .filter((d): d is Date => d !== null);

  const newOwnerSignupsThisMonth = ownerSmartRefillUsers.filter(({ data }) => {
    const createdAt = toDate(data.createdAt);
    return createdAt !== null && createdAt >= monthStart;
  }).length;

  const newAllSmartRefillUsersThisMonth = smartRefillUsers.filter((doc) => {
    const createdAt = toDate(doc.data().createdAt);
    return createdAt !== null && createdAt >= monthStart;
  }).length;

  const businessGrowthDates = businessDocs
    .map((doc) => toDate(doc.data().createdAt))
    .filter((d): d is Date => d !== null);

  const onboardedBusinesses = businessDocs.filter((doc) =>
    isTruthyFlag(doc.data().onboardingComplete),
  ).length;

  const usageGoalCounts = new Map<string, number>();
  const featureTotals = new Map<string, { completed: number; total: number }>();
  GETTING_STARTED_FEATURES.forEach((feature) => {
    featureTotals.set(feature, { completed: 0, total: 0 });
  });

  businessDocs.forEach((doc) => {
    const data = doc.data();
    const goals = Array.isArray(data.usageGoals) ? data.usageGoals : [];
    goals.forEach((goal: unknown) => {
      const key = String(goal);
      usageGoalCounts.set(key, (usageGoalCounts.get(key) || 0) + 1);
    });

    const gettingStarted =
      data.gettingStarted && typeof data.gettingStarted === "object" ?
        (data.gettingStarted as Record<string, unknown>) :
        {};
    GETTING_STARTED_FEATURES.forEach((feature) => {
      const bucket = featureTotals.get(feature);
      if (!bucket) return;
      bucket.total += 1;
      if (isTruthyFlag(gettingStarted[feature])) {
        bucket.completed += 1;
      }
    });
  });

  const planCounts = new Map<string, number>();
  const recentBusinesses: DashboardAnalytics["recentBusinesses"] = [];
  const businessLocations: DashboardAnalytics["businessLocations"] = [];
  const topBusinessesByCustomers: DashboardAnalytics["topBusinessesByCustomers"] =
    [];
  const businessSnapshots: BusinessSnapshot[] = [];
  const chartBusinessContext: ChartBusinessContext[] = [];
  const subscriptionsByBusiness = new Map<
    string,
    ReturnType<typeof mapOwnerSubscriptions>
  >();
  const feedbackEntries = appsFeedbackSnap.docs.map((doc) =>
    mapPlatformFeedbackDoc(doc.id, doc.data() as Record<string, unknown>),
  );
  let totalCustomers = 0;
  let activeCustomers = 0;
  let deactivatedCustomers = 0;
  const businessTierCounts = emptyBusinessTierCounts();
  const transactionBreakdown = emptyTransactionBreakdown();
  let totalTransactions = 0;
  let transactionsLast30Days = 0;
  let refillVolumeLast30Days = 0;
  const transactionDailyRows: Array<{ date: Date; amount: number }> = [];
  const transactionVolumeByMonth = new Map<
    string,
    { count: number; amount: number }
  >();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sixMonthsAgoTimestamp = Timestamp.fromDate(sixMonthsAgo);
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    transactionVolumeByMonth.set(monthKey(d), { count: 0, amount: 0 });
  }

  await mapWithConcurrency(
    businessDocs,
    BUSINESS_QUERY_CONCURRENCY,
    async (bizDoc) => {
      const data = bizDoc.data();
      const [
        customersCountSnap,
        deactivatedCustomersSnap,
        subscriptionsSnap,
        transactionsSnap,
        walkInCountSnap,
        directSaleCountSnap,
        orderCountSnap,
      ] = await Promise.all([
        bizDoc.ref.collection("customers").count().get(),
        bizDoc.ref
          .collection("customers")
          .where("status", "in", ["inactive", "archived"])
          .count()
          .get(),
        bizDoc.ref
          .collection("subscriptions")
          .orderBy("createdAt", "desc")
          .limit(20)
          .get(),
        bizDoc.ref
          .collection("transactions")
          .where("createdAt", ">=", sixMonthsAgoTimestamp)
          .select("createdAt", "totalAmount", "waterRefills")
          .get(),
        bizDoc.ref.collection("transactions").where("type", "==", "walkin").count().get(),
        bizDoc.ref.collection("transactions").where("type", "==", "direct_sale").count().get(),
        bizDoc.ref
          .collection("transactions")
          .where("type", "in", ["delivery", "collection"])
          .count()
          .get(),
      ]);

      subscriptionsByBusiness.set(
        bizDoc.id,
        mapOwnerSubscriptions(
          subscriptionsSnap.docs.map((doc) => ({
            id: doc.id,
            data: () => doc.data() as Record<string, unknown>,
          })),
        ),
      );
      const mappedSubscriptions = subscriptionsByBusiness.get(bizDoc.id) ?? [];
      const currentSubscription = mappedSubscriptions.find(
        (sub) => sub.timeline === "current",
      );

      const customers = customersCountSnap.data().count;
      const deactivated = deactivatedCustomersSnap.data().count;
      totalCustomers += customers;
      deactivatedCustomers += deactivated;
      activeCustomers += Math.max(0, customers - deactivated);

      const walkIn = walkInCountSnap.data().count;
      const directSale = directSaleCountSnap.data().count;
      const orders = orderCountSnap.data().count;
      transactionBreakdown.walkIn += walkIn;
      transactionBreakdown.directSale += directSale;
      transactionBreakdown.orders += orders;
      totalTransactions += walkIn + directSale + orders;
      topBusinessesByCustomers.push({
        id: bizDoc.id,
        name: String(data.name || "Unnamed business"),
        customers,
      });

      let planName: string | undefined;
      let planCode: string | undefined;
      let subscriptionStatus: string | undefined;
      let paymentStatus: string | undefined;
      let price = 0;
      if (!subscriptionsSnap.empty) {
        const sub = subscriptionsSnap.docs[0].data();
        planName = String(sub.planName || sub.planCode || "Unknown");
        planCode =
          typeof sub.planCode === "string" ? sub.planCode : undefined;
        subscriptionStatus =
          typeof sub.status === "string" ? sub.status : undefined;
        paymentStatus =
          typeof sub.paymentStatus === "string" ? sub.paymentStatus : undefined;
        price = Number(sub.price || 0);
        if (sub.status === "active") {
          planCounts.set(planName, (planCounts.get(planName) || 0) + 1);
        }
      }

      const businessTier = classifyBusinessTier(
        planName,
        planCode,
        subscriptionStatus,
      );
      businessTierCounts[businessTier] += 1;

      const businessName = String(data.name || "Unnamed business");
      const ownerId =
        typeof data.ownerId === "string" ? data.ownerId : undefined;
      const ownerEmail =
        typeof data.email === "string" ? data.email : undefined;
      const onboardingComplete = isTruthyFlag(data.onboardingComplete);

      recentBusinesses.push({
        id: bizDoc.id,
        name: businessName,
        ownerEmail,
        createdAt: toDate(data.createdAt)?.toISOString() ?? null,
        onboardingComplete,
        planName,
      });

      const coords = parseBusinessCoordinates(data.location);

      const gettingStarted =
        data.gettingStarted && typeof data.gettingStarted === "object" ?
          (data.gettingStarted as Record<string, unknown>) :
          {};
      let businessTx30 = 0;

      transactionsSnap.docs.forEach((txDoc) => {
        const tx = txDoc.data();
        const createdAt = toDate(tx.createdAt);
        if (!createdAt) return;

        const amount = Number(tx.totalAmount || 0);
        const refills = Array.isArray(tx.waterRefills) ? tx.waterRefills.length : 0;

        if (createdAt >= thirtyDaysAgo) {
          transactionsLast30Days += 1;
          businessTx30 += 1;
          refillVolumeLast30Days += refills;
        }

        if (createdAt >= sixMonthsAgo) {
          const key = monthKey(createdAt);
          const bucket = transactionVolumeByMonth.get(key);
          if (bucket) {
            bucket.count += 1;
            bucket.amount += amount;
          }
        }

        if (dayKey(createdAt) >= chartWindowKey) {
          transactionDailyRows.push({ date: createdAt, amount });
        }
      });

      const healthTier = classifyHealthForSnapshot({
        id: bizDoc.id,
        name: businessName,
        createdAt: toDate(data.createdAt),
        onboardingComplete,
        price,
        customers,
        transactionsLast30Days: businessTx30,
        gettingStartedCompleted: countGettingStartedDone(gettingStarted),
      });

      if (coords && !isTestAccountOwnerId(ownerId, testAccountOwnerIds)) {
        const communityDispatch =
          data.communityDispatch && typeof data.communityDispatch === "object" ?
            (data.communityDispatch as Record<string, unknown>) :
            {};
        const communityEnabled = communityDispatch.enabled === true;
        const communityPublicName =
          typeof communityDispatch.publicName === "string" ?
            communityDispatch.publicName.trim() :
            undefined;

        businessLocations.push({
          id: bizDoc.id,
          name: businessName,
          ownerEmail,
          ownerId,
          lat: coords.lat,
          lng: coords.lng,
          address: coords.address,
          onboardingComplete,
          planName,
          planCode,
          billingCycle: currentSubscription?.billingCycle,
          authAccountTag:
            ownerId ? authAccountTagByUserId.get(ownerId) ?? null : null,
          healthTier,
          customers,
          transactionsLast30Days: businessTx30,
          communityDispatchEnabled: communityEnabled,
          communityPublicName: communityPublicName || undefined,
          pendingCommunityOffers: pendingCommunityOffers.get(bizDoc.id) ?? 0,
        });
      }

      chartBusinessContext.push({
        id: bizDoc.id,
        createdAt: toDate(data.createdAt)?.toISOString() ?? null,
        healthTier,
        planName,
        planCode,
        paymentStatus,
        price,
        customers,
        transactionsLast30Days: businessTx30,
        usageGoals: Array.isArray(data.usageGoals) ?
          data.usageGoals.map(String) :
          [],
        gettingStarted: Object.fromEntries(
          GETTING_STARTED_FEATURES.map((feature) => [
            feature,
            isTruthyFlag(gettingStarted[feature]),
          ]),
        ),
      });

      businessSnapshots.push({
        id: bizDoc.id,
        name: businessName,
        ownerId,
        ownerEmail,
        address: coords?.address,
        createdAt: toDate(data.createdAt),
        onboardingComplete,
        planName,
        planCode,
        subscriptionStatus,
        paymentStatus,
        price,
        customers,
        transactionsLast30Days: businessTx30,
        gettingStartedCompleted: countGettingStartedDone(gettingStarted),
      });

      if (
        data.userFeedback &&
        typeof data.userFeedback === "object" &&
        !Array.isArray(data.userFeedback)
      ) {
        feedbackEntries.push(
          mapWorkspaceFeedback({
            businessId: bizDoc.id,
            businessName,
            ownerEmail,
            userFeedback: data.userFeedback as Record<string, unknown>,
          }),
        );
      }
    },
  );

  const appFeedback = computeAppFeedback(feedbackEntries);

  const salesInsights = computeSalesInsights({
    businesses: businessSnapshots,
    newSmartRefillUsersThisMonth: newAllSmartRefillUsersThisMonth,
    monthStart,
  });

  const proposalPipeline = computeProposalPipeline({
    proposals: proposalsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        status: String(data.status || "unknown"),
        amount: Number(data.amount || 0),
        clientId:
          typeof data.clientId === "string" ? data.clientId : undefined,
      };
    }),
    clients: clientsSnap.docs.map((doc) => ({
      clientType:
        typeof doc.data().clientType === "string" ?
          doc.data().clientType :
          undefined,
    })),
  });

  recentBusinesses.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  topBusinessesByCustomers.sort((a, b) => b.customers - a.customers);

  const ownerLastActive = new Map<string, string>();
  const chartLoginDaySessions = new Map<string, number>();
  const chartLoginDayUsers = new Map<string, Set<string>>();
  const loginDaySessions = new Map<string, number>();
  const loginDayUsers = new Map<string, Set<string>>();
  const activeUserIds = new Set<string>();
  const deviceSessions = new Map<string, number>();
  const deviceUsers = new Map<string, Set<string>>();
  const browserSessions = new Map<string, number>();
  const browserUsers = new Map<string, Set<string>>();
  const roleActiveTimeBuckets = createRoleActiveTimeBuckets();
  let loginSessionsLast30Days = 0;

  const chartDeviceSessions = new Map<string, Map<string, number>>();
  const chartBrowserSessions = new Map<string, Map<string, number>>();
  const bumpChartUsage = (
    map: Map<string, Map<string, number>>,
    day: string,
    key: string,
  ) => {
    if (day < chartWindowKey) return;
    let inner = map.get(day);
    if (!inner) {
      inner = new Map();
      map.set(day, inner);
    }
    inner.set(key, (inner.get(key) || 0) + 1);
  };

  const bumpUsage = (
    map: Map<string, number>,
    userMap: Map<string, Set<string>>,
    key: string,
    userId: string,
  ) => {
    map.set(key, (map.get(key) || 0) + 1);
    let users = userMap.get(key);
    if (!users) {
      users = new Set();
      userMap.set(key, users);
    }
    users.add(userId);
  };

  await mapWithConcurrency(
    smartRefillUsers,
    LOGIN_EVENT_QUERY_CONCURRENCY,
    async (userDoc) => {
      const eventsSnap = await userDoc.ref
        .collection("login_events")
        .where("calendarDayUtc", ">=", chartWindowKey)
        .select(
          "calendarDayUtc",
          "timestamp",
          "userAgent",
          "appId",
        )
        .get();
      eventsSnap.docs.forEach((eventDoc) => {
        const event = eventDoc.data();
        if (String(event.appId || "") !== SMARTREFILL_APP_ID) return;
        const day = String(event.calendarDayUtc || "");
        if (!day) return;

        const previous = ownerLastActive.get(userDoc.id);
        if (!previous || day > previous) {
          ownerLastActive.set(userDoc.id, day);
        }

        const { device, browser } = parseUserAgent(event.userAgent);
        if (day >= chartWindowKey) {
          chartLoginDaySessions.set(
            day,
            (chartLoginDaySessions.get(day) || 0) + 1,
          );
          if (!chartLoginDayUsers.has(day)) chartLoginDayUsers.set(day, new Set());
          let chartDayUsers = chartLoginDayUsers.get(day);
          if (!chartDayUsers) {
            chartDayUsers = new Set();
            chartLoginDayUsers.set(day, chartDayUsers);
          }
          chartDayUsers.add(userDoc.id);
          bumpChartUsage(chartDeviceSessions, day, device);
          bumpChartUsage(chartBrowserSessions, day, browser);
        }

        if (day < thirtyDayKey) return;

        activeUserIds.add(userDoc.id);
        loginSessionsLast30Days += 1;
        loginDaySessions.set(day, (loginDaySessions.get(day) || 0) + 1);
        if (!loginDayUsers.has(day)) loginDayUsers.set(day, new Set());
        let dayUsers = loginDayUsers.get(day);
        if (!dayUsers) {
          dayUsers = new Set();
          loginDayUsers.set(day, dayUsers);
        }
        dayUsers.add(userDoc.id);

        bumpUsage(deviceSessions, deviceUsers, device, userDoc.id);
        bumpUsage(browserSessions, browserUsers, browser, userDoc.id);

        const eventTimestamp = toDate(event.timestamp);
        if (eventTimestamp) {
          const role = resolveSmartRefillUserRole(
            userDoc.id,
            userDoc.data(),
            businessOwnerIds,
          );
          if (role === "owner" || role === "admin" || role === "rider") {
            recordRoleActiveTime(
              roleActiveTimeBuckets,
              role,
              minutesOfDayInTimezone(eventTimestamp),
            );
          }
        }
      });
    },
  );

  const toUsageRows = (
    sessions: Map<string, number>,
    users: Map<string, Set<string>>,
  ) =>
    [...sessions.entries()]
      .map(([name, count]) => ({
        name,
        sessions: count,
        uniqueUsers: users.get(name)?.size || 0,
      }))
      .sort((a, b) => b.sessions - a.sessions);

  const deviceUsage = toUsageRows(deviceSessions, deviceUsers);
  const browserUsage = toUsageRows(browserSessions, browserUsers);
  const avgActiveTimeByRole = summarizeRoleActiveTimes(roleActiveTimeBuckets);

  const dailyActiveUsers = [...loginDaySessions.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sessions]) => ({
      date,
      sessions,
      uniqueUsers: loginDayUsers.get(date)?.size || 0,
    }));

  const userRoleCounts = countSmartRefillUserRoles(
    smartRefillUsers.map((doc) => ({ id: doc.id, data: doc.data() })),
    businessOwnerIds,
  );

  const usersById = new Set(usersSnap.docs.map((doc) => doc.id));
  const businessById = new Map(
    businessDocs.map((doc) => [
      doc.id,
      {
        ownerId:
          typeof doc.data().ownerId === "string" ? doc.data().ownerId : undefined,
      },
    ]),
  );
  const virtualStaffCounts = countVirtualStaffRecords(
    ridersSnap,
    businessById,
    usersById,
  );
  const inventoryBreakdown = aggregatePlatformInventory(inventoryItemsSnap);
  const totalInventory = sumInventoryBreakdown(inventoryBreakdown);

  const activeLoginUsersByRole = countActiveUsersByRole(
    activeUserIds,
    smartRefillUsers.map((doc) => ({ id: doc.id, data: doc.data() })),
    businessOwnerIds,
  );

  const smartRefillUserRecords = smartRefillUsers.map((doc) => ({
    id: doc.id,
    data: doc.data(),
    createdAt: toDate(doc.data().createdAt),
  }));

  const { growth, activeOwners } = computeGrowthSalesMetrics({
    businesses: businessSnapshots,
    ownerLastActive,
    testAccountOwnerIds,
    ownerUserGrowth: buildMonthlySeries(ownerUserGrowthDates),
    businessGrowth: buildMonthlySeries(businessGrowthDates),
    totalCustomers,
    smartRefillUsers: smartRefillUsers.length,
    smartRefillUserRecords,
    userRoleCounts,
    activeLoginUsers: activeUserIds.size,
    activeLoginUsersByRole,
    loginSessionsLast30Days,
    topDevice: deviceUsage[0]?.name || "—",
    topBrowser: browserUsage[0]?.name || "—",
    deviceUsage,
    browserUsage,
    avgActiveTimeByRole,
    featureAdoption: GETTING_STARTED_FEATURES.map((feature) => {
      const bucket = featureTotals.get(feature);
      const completed = bucket?.completed ?? 0;
      const total = bucket?.total ?? 0;
      const rate =
        total > 0 ?
          Math.round((completed / total) * 100) :
          0;
      return {
        feature,
        rate,
        completed,
        total,
      };
    }).sort((a, b) => b.rate - a.rate),
    dailyActiveUsers,
    newOwnerSignupsThisMonth,
    newWorkspacesThisMonth: salesInsights.newWorkspacesThisMonth,
    monthStart,
    activeWindowStartKey: thirtyDayKey,
    subscriptionsByBusiness,
    virtualStaffCounts,
  });

  const behavioral = await computeBehavioralSalesMetrics({
    businesses: businessSnapshots,
    ownerLastActive,
    smartRefillUserRecords,
    businessOwnerIds,
    activeWindowStartKey: thirtyDayKey,
    todayKey: dayKey(now),
  });

  const growthSalesMetrics: GrowthSalesMetrics = {
    growth,
    sales: behavioral.sales,
    activeOwners,
  };

  const chartTimeSeries: ChartTimeSeries = {
    ownerSignupsDaily: buildDailyCountSeries(
      ownerUserGrowthDates,
      CHART_SERIES_DAYS,
      now,
    ),
    workspacesDaily: buildDailyCountSeries(
      businessGrowthDates,
      CHART_SERIES_DAYS,
      now,
    ),
    loginDaily: buildLoginDailySeries({
      loginDaySessions: chartLoginDaySessions,
      loginDayUsers: chartLoginDayUsers,
      daysBack: CHART_SERIES_DAYS,
      now,
    }),
    transactionsDaily: buildTransactionDailySeries({
      rows: transactionDailyRows,
      daysBack: CHART_SERIES_DAYS,
      now,
    }),
    deviceSessionsDaily: flattenDailyUsage(chartDeviceSessions),
    browserSessionsDaily: flattenDailyUsage(chartBrowserSessions),
  };

  const newJoiners = buildNewJoiners({
    salesDocs: salesSnap.docs,
    recentBusinesses,
    smartRefillUsers: smartRefillUsers.map((doc) => ({
      id: doc.id,
      data: doc.data(),
    })),
    businessOwnerIds,
  });

  const businessNamesById = new Map(
    businessDocs.map((doc) => [
      doc.id,
      String(doc.data().name || "Unnamed business"),
    ]),
  );
  const builtPlatformAlerts = buildPlatformAlerts({
    inquiries: inquiriesSnap.docs.map((doc) => ({
      id: doc.id,
      data: doc.data() as Record<string, unknown>,
    })),
    newJoiners,
    subscriptionsByBusiness,
    businessNamesById,
    now,
  });
  const [alertContactStatuses, dashboardForecasts] = await Promise.all([
    getPlatformAlertContactStatuses(
      builtPlatformAlerts.items.map((item) => item.id),
    ),
    generateDashboardForecasts({
      summary: {
        smartRefillUsers: smartRefillUsers.length,
        onboardedBusinesses,
        totalBusinesses: businessDocs.length,
        totalCustomers,
        activeLoginUsers: activeUserIds.size,
        transactionsLast30Days,
        refillVolumeLast30Days,
      },
      salesInsights,
      proposalPipeline,
      aiSalesInsights: behavioral.aiSalesInsights,
    }),
  ]);
  const platformAlerts = attachContactStatusToAlerts(
    builtPlatformAlerts,
    alertContactStatuses,
  );

  return {
    summary: {
      smartRefillUsers: smartRefillUsers.length,
      onboardedBusinesses,
      totalBusinesses: businessDocs.length,
      totalCustomers,
      activeLoginUsers: activeUserIds.size,
      loginSessionsLast30Days,
      topDevice: deviceUsage[0]?.name || "—",
      topBrowser: browserUsage[0]?.name || "—",
      transactionsLast30Days,
      refillVolumeLast30Days,
      totalTransactions,
      transactionBreakdown,
      customerBreakdown: {
        active: activeCustomers,
        deactivated: deactivatedCustomers,
      },
      userRoleCounts: {
        owners: userRoleCounts.owners,
        admins: userRoleCounts.admins,
        riders: userRoleCounts.riders,
      },
      virtualStaffCounts,
      businessTierCounts,
      totalInventory,
      inventoryBreakdown,
    },
    userGrowth: buildMonthlySeries(ownerUserGrowthDates),
    businessGrowth: buildMonthlySeries(businessGrowthDates),
    dailyActiveUsers,
    deviceUsage,
    browserUsage,
    planDistribution: [...planCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    usageGoals: [...usageGoalCounts.entries()]
      .map(([goal, count]) => ({ goal, count }))
      .sort((a, b) => b.count - a.count),
    featureAdoption: GETTING_STARTED_FEATURES.map((feature) => {
      const bucket = featureTotals.get(feature);
      const completed = bucket?.completed ?? 0;
      const total = bucket?.total ?? 0;
      const rate =
        total > 0 ?
          Math.round((completed / total) * 100) :
          0;
      return {
        feature,
        rate,
        completed,
        total,
      };
    }).sort((a, b) => b.rate - a.rate),
    transactionVolume: [...transactionVolumeByMonth.entries()].map(
      ([month, value]) => ({
        month,
        count: value.count,
        amount: value.amount,
      }),
    ),
    recentBusinesses: recentBusinesses.slice(0, 8),
    topBusinessesByCustomers: topBusinessesByCustomers.slice(0, 6),
    businessLocations: businessLocations
      .filter((loc) => !isTestAccountOwnerId(loc.ownerId, testAccountOwnerIds))
      .map((loc) => ({
        ...loc,
        lastActiveDay:
          loc.ownerId ? ownerLastActive.get(loc.ownerId) : undefined,
      })),
    communityDispatchMetrics,
    communityChannelUsage,
    salesInsights,
    proposalPipeline,
    appFeedback,
    growthSalesMetrics,
    chartTimeSeries,
    chartBusinessContext,
    aiSalesInsights: behavioral.aiSalesInsights,
    dashboardForecasts,
    newJoiners,
    platformAlerts,
  };
}
