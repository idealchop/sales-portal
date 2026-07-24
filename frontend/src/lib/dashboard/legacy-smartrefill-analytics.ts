export type LegacyStationTriageStatus = "open" | "contacted" | "ignored";

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

export type LegacySmartRefillAnalyticsFetchResult = {
  data: LegacySmartRefillAnalytics;
  computedAt: string;
};
