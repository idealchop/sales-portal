import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "../config/firebase-admin";

const PLATFORM_CHANNEL_USAGE_PATH = "platform/channel_usage";
const MANILA_TZ = "Asia/Manila";
const TOP_STATIONS_LIMIT = 8;

export type CommunityChannelUsageBilling = {
  periodKey: string;
  platformMessengerIntake: number;
  platformWhatsappIntake: number;
  stationAcceptsTotal: number;
  communityEnrolledStations: number;
  stationsReportingAccepts: number;
  topStationsByAccepts: Array<{
    businessId: string;
    businessName: string;
    accepts: number;
  }>;
};

export function manilaPeriodKey(now = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${y}-${m}`;
}

function resolveBusinessDisplayName(
  data: FirebaseFirestore.DocumentData,
): string {
  const community = data.communityDispatch as { publicName?: string } | undefined;
  if (typeof community?.publicName === "string" && community.publicName.trim()) {
    return community.publicName.trim();
  }
  if (typeof data.name === "string" && data.name.trim()) {
    return data.name.trim();
  }
  return "Station";
}

export function aggregateStationCommunityAccepts(
  businessDocs: QueryDocumentSnapshot[],
  periodKey: string,
): Pick<
  CommunityChannelUsageBilling,
  | "stationAcceptsTotal"
  | "communityEnrolledStations"
  | "stationsReportingAccepts"
  | "topStationsByAccepts"
> {
  let stationAcceptsTotal = 0;
  let communityEnrolledStations = 0;
  let stationsReportingAccepts = 0;
  const acceptCounts: Array<{
    businessId: string;
    businessName: string;
    accepts: number;
  }> = [];

  for (const doc of businessDocs) {
    const data = doc.data();
    const community = data.communityDispatch as { enabled?: boolean; publicName?: string } | undefined;
    const enrolled = community?.enabled === true;
    if (enrolled) {
      communityEnrolledStations += 1;
    }

    const channelUsage = data.channelUsage as
      | { periodKey?: string; communityOrdersAccepted?: number }
      | undefined;
    if (!enrolled || !channelUsage || channelUsage.periodKey !== periodKey) continue;

    const accepts = Math.max(0, Number(channelUsage.communityOrdersAccepted) || 0);
    if (accepts <= 0) continue;

    stationsReportingAccepts += 1;
    stationAcceptsTotal += accepts;
    acceptCounts.push({
      businessId: doc.id,
      businessName: resolveBusinessDisplayName(data),
      accepts,
    });
  }

  acceptCounts.sort((a, b) => b.accepts - a.accepts);

  return {
    stationAcceptsTotal,
    communityEnrolledStations,
    stationsReportingAccepts,
    topStationsByAccepts: acceptCounts.slice(0, TOP_STATIONS_LIMIT),
  };
}

export async function readPlatformCommunityChannelUsage(
  now = new Date(),
): Promise<
  Pick<
    CommunityChannelUsageBilling,
    "periodKey" | "platformMessengerIntake" | "platformWhatsappIntake"
  >
> {
  const periodKey = manilaPeriodKey(now);
  const snap = await db.doc(PLATFORM_CHANNEL_USAGE_PATH).get();
  const raw = snap.data();

  if (!raw || raw.periodKey !== periodKey) {
    return {
      periodKey,
      platformMessengerIntake: 0,
      platformWhatsappIntake: 0,
    };
  }

  return {
    periodKey,
    platformMessengerIntake: Math.max(0, Number(raw.communityMessengerIntake) || 0),
    platformWhatsappIntake: Math.max(0, Number(raw.communityWhatsappIntake) || 0),
  };
}

/** CP-26 — platform intake + per-station accept counters for Sales Portal billing. */
export async function loadCommunityChannelUsageBilling(
  businessDocs: QueryDocumentSnapshot[],
  now = new Date(),
): Promise<CommunityChannelUsageBilling> {
  const platform = await readPlatformCommunityChannelUsage(now);
  const stations = aggregateStationCommunityAccepts(businessDocs, platform.periodKey);
  return { ...platform, ...stations };
}
