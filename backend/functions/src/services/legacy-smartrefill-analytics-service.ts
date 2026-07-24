import { Timestamp } from "firebase-admin/firestore";
import { prodSmartrefillDb } from "../config/firebase-admin";
import { mapWithConcurrency } from "../utils/map-with-concurrency";
import {
  getLegacyStationFlag,
  getLegacyStationFlagsMap,
  type LegacyStationTriageStatus,
} from "./legacy-smartrefill-station-actions";

const CACHE_TTL_MS = 5 * 60 * 1000;
const PROFILE_CONCURRENCY = 20;
const DELIVERY_SCAN_CONCURRENCY = 8;
const CHART_DAYS = 90;

export type LegacySmartRefillStation = {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  onboardingComplete: boolean;
  customerCount: number;
  deliveryCount: number;
  revenueTotal: number;
  bottlesTotal: number;
  unpaidTotal: number;
  lastDeliveryAt: string | null;
  triageStatus: LegacyStationTriageStatus;
  contactedAt: string | null;
  ignoredAt: string | null;
};

export type LegacySmartRefillCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  paymentMethod: string | null;
  containerType: string | null;
  waterType: string | null;
  pricePerBottle: number | null;
  lastOrder: string | null;
  createdAt: string | null;
};

export type LegacySmartRefillTransaction = {
  id: string;
  customerId: string | null;
  customerName: string;
  date: string | null;
  createdAt: string | null;
  bottles: number;
  amount: number;
  paidAmount: number;
  unpaidAmount: number;
  status: string | null;
  deliveryType: string | null;
  paymentMethod: string | null;
  deliveredBy: string | null;
  referenceNumber: string | null;
  notes: string | null;
};

export type LegacySmartRefillLead = {
  id: string;
  kind: "inquiry" | "demo_request" | "business_inquiry";
  name: string;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  subtitle: string;
  status: string | null;
  occurredAt: string | null;
};

export type LegacyChartPoint = {
  date: string;
  count: number;
  revenue: number;
  bottles: number;
};

export type LegacyNamedCount = {
  name: string;
  count: number;
  value?: number;
};

export type LegacySmartRefillAnalytics = {
  sourceDatabase: string;
  summary: {
    totalUsers: number;
    stationsWithProfile: number;
    stationsWithActivity: number;
    onboardedStations: number;
    mappedStations: number;
    totalCustomers: number;
    totalDeliveries: number;
    totalRevenue: number;
    totalBottles: number;
    totalUnpaid: number;
    openInquiries: number;
    demoRequests: number;
    businessInquiries: number;
  };
  stations: LegacySmartRefillStation[];
  charts: {
    deliveriesByDay: LegacyChartPoint[];
    topStationsByRevenue: LegacyNamedCount[];
    topStationsByCustomers: LegacyNamedCount[];
    deliveryTypeMix: LegacyNamedCount[];
    paymentMethodMix: LegacyNamedCount[];
  };
  leads: LegacySmartRefillLead[];
};

export type LegacySmartRefillStationDetail = {
  station: LegacySmartRefillStation;
  customers: LegacySmartRefillCustomer[];
  transactions: LegacySmartRefillTransaction[];
  transactionPage: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

type CacheEntry = {
  expiresAt: number;
  data: LegacySmartRefillAnalytics;
  computedAt: string;
};

let cache: CacheEntry | null = null;

export function clearLegacySmartRefillAnalyticsCache(): void {
  cache = null;
}

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const ms = Date.parse(trimmed);
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
    // Legacy often stores YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return `${trimmed}T00:00:00.000Z`;
    }
    return trimmed;
  }
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "_seconds" in value &&
    typeof (value as { _seconds: unknown })._seconds === "number"
  ) {
    const seconds = (value as { _seconds: number; _nanoseconds?: number })
      ._seconds;
    const nanos =
      (value as { _nanoseconds?: number })._nanoseconds ?? 0;
    return new Date(seconds * 1000 + Math.floor(nanos / 1e6)).toISOString();
  }
  return null;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function dayKey(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

function bumpNamed(
  map: Map<string, { count: number; value: number }>,
  name: string,
  value = 0,
) {
  const key = name.trim() || "Unknown";
  const current = map.get(key) || { count: 0, value: 0 };
  current.count += 1;
  current.value += value;
  map.set(key, current);
}

function fullName(first?: unknown, last?: unknown, fallback = ""): string {
  const parts = [first, last]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return parts.join(" ") || fallback;
}

function mapCustomer(
  id: string,
  data: Record<string, unknown>,
): LegacySmartRefillCustomer {
  return {
    id,
    name: String(data.name || "").trim() || "Customer",
    email: String(data.email || "").trim() || null,
    phone: String(data.phone || "").trim() || null,
    address: String(data.address || "").trim() || null,
    paymentMethod: String(data.paymentMethod || "").trim() || null,
    containerType: String(data.containerType || "").trim() || null,
    waterType: String(data.waterType || "").trim() || null,
    pricePerBottle:
      data.pricePerBottle == null ? null : toNumber(data.pricePerBottle),
    lastOrder: toIso(data.lastOrder) || String(data.lastOrder || "").trim() || null,
    createdAt: toIso(data.createdAt),
  };
}

function mapTransaction(
  id: string,
  data: Record<string, unknown>,
): LegacySmartRefillTransaction {
  const amount = toNumber(data.amount);
  const paidAmount = toNumber(data.paidAmount);
  return {
    id,
    customerId: String(data.customerId || "").trim() || null,
    customerName: String(data.name || "").trim() || "Customer",
    date: toIso(data.date) || String(data.date || "").trim() || null,
    createdAt: toIso(data.createdAt),
    bottles: toNumber(data.bottles),
    amount,
    paidAmount,
    unpaidAmount: Math.max(0, amount - paidAmount),
    status: String(data.status || "").trim() || null,
    deliveryType: String(data.deliveryType || "").trim() || null,
    paymentMethod: String(data.paymentMethod || "").trim() || null,
    deliveredBy: String(data.deliveredBy || "").trim() || null,
    referenceNumber: String(data.referenceNumber || "").trim() || null,
    notes: String(data.notes || "").trim() || null,
  };
}

async function loadLeads(): Promise<{
  leads: LegacySmartRefillLead[];
  openInquiries: number;
  demoRequests: number;
  businessInquiries: number;
}> {
  const [inquiriesSnap, demosSnap, businessSnap] = await Promise.all([
    prodSmartrefillDb.collection("inquiries").get(),
    prodSmartrefillDb.collection("demo-requests").get(),
    prodSmartrefillDb.collection("businessInquiries").get(),
  ]);

  const leads: LegacySmartRefillLead[] = [];

  for (const doc of inquiriesSnap.docs) {
    const data = doc.data();
    const business = (data.business || {}) as Record<string, unknown>;
    leads.push({
      id: doc.id,
      kind: "inquiry",
      name: fullName(data.firstName, data.lastName, "Inquiry"),
      email: String(data.email || "").trim() || null,
      phone: String(data.phone || "").trim() || null,
      businessName: String(business.name || "").trim() || null,
      subtitle:
        String(data.inquiry || "").trim() ||
        String(data.message || "").trim() ||
        "Business inquiry",
      status: String(data.status || "").trim() || null,
      occurredAt: toIso(data.createdAt) || toIso(data.updatedAt),
    });
  }

  for (const doc of demosSnap.docs) {
    const data = doc.data();
    leads.push({
      id: doc.id,
      kind: "demo_request",
      name: String(data.name || "").trim() || "Demo request",
      email: String(data.email || "").trim() || null,
      phone: String(data.phone || "").trim() || null,
      businessName: String(data.businessName || "").trim() || null,
      subtitle: data.requestedDate ?
          `Requested demo date: ${String(data.requestedDate)}`
        : "Demo request",
      status: null,
      occurredAt: toIso(data.submittedAt),
    });
  }

  for (const doc of businessSnap.docs) {
    const data = doc.data();
    leads.push({
      id: doc.id,
      kind: "business_inquiry",
      name: fullName(data.firstName, data.lastName, "Business inquiry"),
      email: String(data.email || "").trim() || null,
      phone: String(data.phone || "").trim() || null,
      businessName: String(data.businessName || "").trim() || null,
      subtitle:
        String(data.message || "").trim() ||
        String(data.businessAddress || "").trim() ||
        "Business inquiry",
      status: null,
      occurredAt: toIso(data.submittedAt),
    });
  }

  leads.sort((a, b) => {
    const aMs = a.occurredAt ? Date.parse(a.occurredAt) : 0;
    const bMs = b.occurredAt ? Date.parse(b.occurredAt) : 0;
    return bMs - aMs;
  });

  return {
    leads,
    openInquiries: inquiriesSnap.size,
    demoRequests: demosSnap.size,
    businessInquiries: businessSnap.size,
  };
}

async function buildAnalytics(): Promise<LegacySmartRefillAnalytics> {
  const [usersSnap, flagsMap] = await Promise.all([
    prodSmartrefillDb.collection("users").get(),
    getLegacyStationFlagsMap(),
  ]);
  const chartCutoff = Date.now() - CHART_DAYS * 24 * 60 * 60 * 1000;
  const byDay = new Map<string, LegacyChartPoint>();
  const deliveryTypeMix = new Map<string, { count: number; value: number }>();
  const paymentMethodMix = new Map<string, { count: number; value: number }>();

  const stationRows = await mapWithConcurrency(
    usersSnap.docs,
    PROFILE_CONCURRENCY,
    async (doc) => {
      const user = doc.data();
      const profileSnap = await doc.ref.collection("profile").doc("main").get();
      if (!profileSnap.exists) return null;

      const profile = profileSnap.data() || {};
      const [customerCountSnap, deliveryCountSnap] = await Promise.all([
        doc.ref.collection("customers").count().get(),
        doc.ref.collection("deliveries").count().get(),
      ]);
      const flag = flagsMap.get(doc.id);

      return {
        id: doc.id,
        businessName:
          String(profile.businessName || "").trim() ||
          String(user.displayName || "").trim() ||
          "Unnamed station",
        ownerName:
          String(profile.ownerName || "").trim() ||
          String(user.displayName || "").trim() ||
          "Owner",
        email: String(user.email || "").trim(),
        phone: String(profile.phone || "").trim() || null,
        address: String(profile.stationAddress || "").trim() || null,
        lat: typeof profile.latitude === "number" ? profile.latitude : null,
        lng: typeof profile.longitude === "number" ? profile.longitude : null,
        onboardingComplete: Boolean(profile.onboardingComplete),
        customerCount: customerCountSnap.data().count,
        deliveryCount: deliveryCountSnap.data().count,
        revenueTotal: 0,
        bottlesTotal: 0,
        unpaidTotal: 0,
        lastDeliveryAt: null as string | null,
        triageStatus: flag?.triageStatus ?? "open",
        contactedAt: flag?.contactedAt ?? null,
        ignoredAt: flag?.ignoredAt ?? null,
      } satisfies LegacySmartRefillStation;
    },
  );
  const stations = stationRows.filter(
    (station): station is LegacySmartRefillStation => station != null,
  );

  const activeStations = stations.filter((station) => station.deliveryCount > 0);

  await mapWithConcurrency(
    activeStations,
    DELIVERY_SCAN_CONCURRENCY,
    async (station) => {
      const deliveriesSnap = await prodSmartrefillDb
        .collection("users")
        .doc(station.id)
        .collection("deliveries")
        .get();

      let revenueTotal = 0;
      let bottlesTotal = 0;
      let unpaidTotal = 0;
      let lastDeliveryAt: string | null = null;
      let lastMs = 0;

      for (const deliveryDoc of deliveriesSnap.docs) {
        const data = deliveryDoc.data();
        const amount = toNumber(data.amount);
        const paidAmount = toNumber(data.paidAmount);
        const bottles = toNumber(data.bottles);
        const occurredAt =
          toIso(data.date) || toIso(data.createdAt) || null;
        const occurredMs = occurredAt ? Date.parse(occurredAt) : NaN;

        revenueTotal += amount;
        bottlesTotal += bottles;
        unpaidTotal += Math.max(0, amount - paidAmount);

        bumpNamed(deliveryTypeMix, String(data.deliveryType || "Delivery"), amount);
        bumpNamed(
          paymentMethodMix,
          String(data.paymentMethod || "Unknown"),
          amount,
        );

        if (!Number.isNaN(occurredMs) && occurredMs >= lastMs) {
          lastMs = occurredMs;
          lastDeliveryAt = occurredAt;
        }

        if (!Number.isNaN(occurredMs) && occurredMs >= chartCutoff) {
          const key = dayKey(occurredAt);
          if (key) {
            const point = byDay.get(key) || {
              date: key,
              count: 0,
              revenue: 0,
              bottles: 0,
            };
            point.count += 1;
            point.revenue += amount;
            point.bottles += bottles;
            byDay.set(key, point);
          }
        }
      }

      station.revenueTotal = revenueTotal;
      station.bottlesTotal = bottlesTotal;
      station.unpaidTotal = unpaidTotal;
      station.lastDeliveryAt = lastDeliveryAt;
    },
  );

  stations.sort((a, b) => {
    if (b.deliveryCount !== a.deliveryCount) {
      return b.deliveryCount - a.deliveryCount;
    }
    return a.businessName.localeCompare(b.businessName);
  });

  const leadsResult = await loadLeads();

  const deliveriesByDay = [...byDay.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const topStationsByRevenue = stations
    .filter((station) => station.revenueTotal > 0)
    .slice()
    .sort((a, b) => b.revenueTotal - a.revenueTotal)
    .slice(0, 10)
    .map((station) => ({
      name: station.businessName,
      count: station.deliveryCount,
      value: Math.round(station.revenueTotal * 100) / 100,
    }));

  const topStationsByCustomers = stations
    .filter((station) => station.customerCount > 0)
    .slice()
    .sort((a, b) => b.customerCount - a.customerCount)
    .slice(0, 10)
    .map((station) => ({
      name: station.businessName,
      count: station.customerCount,
    }));

  const toMix = (map: Map<string, { count: number; value: number }>) =>
    [...map.entries()]
      .map(([name, entry]) => ({
        name,
        count: entry.count,
        value: Math.round(entry.value * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count);

  return {
    sourceDatabase:
      process.env.SALES_PORTAL_LEGACY_FIRESTORE_DB || "prod-smartrefill",
    summary: {
      totalUsers: usersSnap.size,
      stationsWithProfile: stations.length,
      stationsWithActivity: stations.filter(
        (station) => station.customerCount + station.deliveryCount > 0,
      ).length,
      onboardedStations: stations.filter((s) => s.onboardingComplete).length,
      mappedStations: stations.filter(
        (s) => s.lat != null && s.lng != null,
      ).length,
      totalCustomers: stations.reduce((sum, s) => sum + s.customerCount, 0),
      totalDeliveries: stations.reduce((sum, s) => sum + s.deliveryCount, 0),
      totalRevenue:
        Math.round(
          stations.reduce((sum, s) => sum + s.revenueTotal, 0) * 100,
        ) / 100,
      totalBottles: stations.reduce((sum, s) => sum + s.bottlesTotal, 0),
      totalUnpaid:
        Math.round(
          stations.reduce((sum, s) => sum + s.unpaidTotal, 0) * 100,
        ) / 100,
      openInquiries: leadsResult.openInquiries,
      demoRequests: leadsResult.demoRequests,
      businessInquiries: leadsResult.businessInquiries,
    },
    stations,
    charts: {
      deliveriesByDay,
      topStationsByRevenue,
      topStationsByCustomers,
      deliveryTypeMix: toMix(deliveryTypeMix),
      paymentMethodMix: toMix(paymentMethodMix),
    },
    leads: leadsResult.leads,
  };
}

export async function fetchLegacySmartRefillAnalytics(options?: {
  forceRefresh?: boolean;
}): Promise<{ data: LegacySmartRefillAnalytics; computedAt: string }> {
  const now = Date.now();
  if (!options?.forceRefresh && cache && cache.expiresAt > now) {
    return { data: cache.data, computedAt: cache.computedAt };
  }

  const data = await buildAnalytics();
  const computedAt = new Date().toISOString();
  cache = {
    data,
    computedAt,
    expiresAt: now + CACHE_TTL_MS,
  };
  return { data, computedAt };
}

export async function fetchLegacySmartRefillStationDetail(input: {
  stationId: string;
  transactionOffset?: number;
  transactionLimit?: number;
}): Promise<LegacySmartRefillStationDetail | null> {
  const stationId = input.stationId.trim();
  if (!stationId) return null;

  const offset = Math.max(0, input.transactionOffset ?? 0);
  const limit = Math.min(200, Math.max(1, input.transactionLimit ?? 50));

  const userRef = prodSmartrefillDb.collection("users").doc(stationId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return null;

  const user = userSnap.data() || {};
  const profileSnap = await userRef.collection("profile").doc("main").get();
  if (!profileSnap.exists) return null;
  const profile = profileSnap.data() || {};

  const [customersSnap, deliveriesSnap] = await Promise.all([
    userRef.collection("customers").get(),
    userRef.collection("deliveries").get(),
  ]);

  const customers = customersSnap.docs
    .map((doc) => mapCustomer(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => a.name.localeCompare(b.name));

  const transactions = deliveriesSnap.docs
    .map((doc) => mapTransaction(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => {
      const aMs = Date.parse(a.date || a.createdAt || "") || 0;
      const bMs = Date.parse(b.date || b.createdAt || "") || 0;
      return bMs - aMs;
    });

  const revenueTotal = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const bottlesTotal = transactions.reduce((sum, tx) => sum + tx.bottles, 0);
  const unpaidTotal = transactions.reduce((sum, tx) => sum + tx.unpaidAmount, 0);
  const lastDeliveryAt = transactions[0]?.date || transactions[0]?.createdAt || null;

  const page = transactions.slice(offset, offset + limit);
  const flag = await getLegacyStationFlag(stationId);

  const station: LegacySmartRefillStation = {
    id: stationId,
    businessName:
      String(profile.businessName || "").trim() ||
      String(user.displayName || "").trim() ||
      "Unnamed station",
    ownerName:
      String(profile.ownerName || "").trim() ||
      String(user.displayName || "").trim() ||
      "Owner",
    email: String(user.email || "").trim(),
    phone: String(profile.phone || "").trim() || null,
    address: String(profile.stationAddress || "").trim() || null,
    lat: typeof profile.latitude === "number" ? profile.latitude : null,
    lng: typeof profile.longitude === "number" ? profile.longitude : null,
    onboardingComplete: Boolean(profile.onboardingComplete),
    customerCount: customers.length,
    deliveryCount: transactions.length,
    revenueTotal: Math.round(revenueTotal * 100) / 100,
    bottlesTotal,
    unpaidTotal: Math.round(unpaidTotal * 100) / 100,
    lastDeliveryAt,
    triageStatus: flag?.triageStatus ?? "open",
    contactedAt: flag?.contactedAt ?? null,
    ignoredAt: flag?.ignoredAt ?? null,
  };

  return {
    station,
    customers,
    transactions: page,
    transactionPage: {
      offset,
      limit,
      total: transactions.length,
      hasMore: offset + limit < transactions.length,
    },
  };
}
