import { customerInitials } from "@/lib/admin/customer-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export type ParsedTeamMemberListRow = {
  memberDoc: UserFirestoreDocumentRow;
  userId: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  isActive: boolean;
  initials: string;
  deliveriesToday: number;
  maxDeliveries: number;
  progressLabel: string;
  progressPercent: number;
  showProgress: boolean;
  isLive: boolean;
  liveLabel: string;
  subtitle: string;
};

export type ParsedTeamMemberDetail = {
  member: ParsedTeamMemberListRow;
  presenceLastSeenLabel: string;
  riderDoc: UserFirestoreDocumentRow | null;
  riderProfile: {
    phone: string;
    vehicle: string;
    status: string;
    maxDeliveries: number;
    maxContainers: number;
    deliveriesToday: number;
    containersToday: number;
    gpsLabel: string;
    locationLabel: string;
  } | null;
  invites: UserFirestoreDocumentRow[];
  remittances: UserFirestoreDocumentRow[];
  teamChats: UserFirestoreDocumentRow[];
};

function readString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ?
      (value as Record<string, unknown>)
    : {};
}

function timestampMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    const seconds = Number((value as { _seconds?: number })._seconds);
    return Number.isFinite(seconds) ? seconds * 1000 : 0;
  }
  return 0;
}

function formatDateTimeLabel(value: unknown): string {
  const ms = timestampMs(value);
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeTimeLabel(value: unknown): string {
  const ms = timestampMs(value);
  if (!ms) return "—";
  const diffMs = Date.now() - ms;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function roleLabel(role: string): string {
  const normalized = role.toLowerCase();
  if (normalized === "admin") return "Admin";
  if (normalized === "rider") return "Rider";
  if (!normalized) return "Member";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function findRiderForMember(
  member: UserFirestoreDocumentRow,
  riders: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow | null {
  const userId = readString(member.data.userId) || member.documentId;
  return (
    riders.find(
      (doc) =>
        readString(doc.data.userId) === userId || doc.documentId === userId,
    ) ?? null
  );
}

function findPresenceForMember(
  member: UserFirestoreDocumentRow,
  presenceDocs: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow | null {
  const userId = readString(member.data.userId) || member.documentId;
  return presenceDocs.find((doc) => doc.documentId === userId) ?? null;
}

function latestActivityMs(
  presence: UserFirestoreDocumentRow | null,
  rider: UserFirestoreDocumentRow | null,
): number {
  const presenceMs = timestampMs(presence?.data.lastSeenAt);
  const location = readRecord(rider?.data.lastLocation);
  const locationMs = timestampMs(location.updatedAt);
  return Math.max(presenceMs, locationMs);
}

export function parseTeamMemberListRow(
  member: UserFirestoreDocumentRow,
  riders: UserFirestoreDocumentRow[],
  presenceDocs: UserFirestoreDocumentRow[],
): ParsedTeamMemberListRow {
  const data = member.data;
  const userId = readString(data.userId) || member.documentId;
  const name =
    readString(data.displayName) || readString(data.name) || member.documentId;
  const role = readString(data.role).toLowerCase() || "member";
  const rider = findRiderForMember(member, riders);
  const presence = findPresenceForMember(member, presenceDocs);
  const quota = readRecord(rider?.data.quota);
  const stats = readRecord(rider?.data.currentStats);
  const maxDeliveries = Number(quota.maxDeliveries) || 0;
  const deliveriesToday = Number(stats.deliveriesToday) || 0;
  const showProgress = role === "rider" && maxDeliveries > 0;
  const progressPercent =
    showProgress ?
      Math.min(100, Math.round((deliveriesToday / maxDeliveries) * 100))
    : 0;
  const activityMs = latestActivityMs(presence, rider);
  const isLive = activityMs > 0 && Date.now() - activityMs < 30 * 60 * 1000;

  return {
    memberDoc: member,
    userId,
    name,
    email: readString(data.email) || "—",
    role,
    roleLabel: roleLabel(role),
    isActive: data.isActive !== false,
    initials: customerInitials(name),
    deliveriesToday,
    maxDeliveries,
    progressLabel: showProgress ? `${deliveriesToday}/${maxDeliveries}` : "—",
    progressPercent,
    showProgress,
    isLive,
    liveLabel: isLive ? "Live" : relativeTimeLabel(activityMs),
    subtitle:
      readString(rider?.data.vehicle) ||
      (role === "rider" ? "Fleet rider" : roleLabel(role)),
  };
}

export function sortTeamMembers(
  members: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  return [...members].sort((a, b) => {
    const nameA =
      readString(a.data.displayName) ||
      readString(a.data.name) ||
      a.documentId;
    const nameB =
      readString(b.data.displayName) ||
      readString(b.data.name) ||
      b.documentId;
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });
}

export function teamInvitesForMember(
  member: UserFirestoreDocumentRow,
  invites: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  const userId = readString(member.data.userId) || member.documentId;
  const email = readString(member.data.email).toLowerCase();
  return invites
    .filter((doc) => {
      const data = doc.data;
      const acceptedByUid = readString(data.acceptedByUid);
      const inviteeEmail = readString(data.inviteeEmail).toLowerCase();
      return acceptedByUid === userId || (email && inviteeEmail === email);
    })
    .sort(
      (a, b) =>
        timestampMs(b.data.createdAt) - timestampMs(a.data.createdAt),
    );
}

export function remittancesForMember(
  member: UserFirestoreDocumentRow,
  rider: UserFirestoreDocumentRow | null,
  remittances: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  const userId = readString(member.data.userId) || member.documentId;
  const riderDocId = rider?.documentId;
  const riderName = readString(rider?.data.name) || readString(member.data.name);

  return remittances
    .filter((doc) => {
      const data = doc.data;
      return (
        (riderDocId && readString(data.riderId) === riderDocId) ||
        readString(data.riderUserId) === userId ||
        (riderName &&
          readString(data.riderName).toLowerCase() === riderName.toLowerCase())
      );
    })
    .sort(
      (a, b) =>
        timestampMs(b.data.acceptedAt ?? b.data.createdAt) -
        timestampMs(a.data.acceptedAt ?? a.data.createdAt),
    );
}

export function teamChatsForMember(
  member: UserFirestoreDocumentRow,
  teamChats: UserFirestoreDocumentRow[],
): UserFirestoreDocumentRow[] {
  const userId = readString(member.data.userId) || member.documentId;

  return teamChats
    .filter((doc) => {
      const participantIds = doc.data.participantIds;
      if (!Array.isArray(participantIds)) return false;
      return participantIds.some((id) => String(id) === userId);
    })
    .sort(
      (a, b) =>
        timestampMs(b.data.lastMessageAt ?? b.data.updatedAt) -
        timestampMs(a.data.lastMessageAt ?? a.data.updatedAt),
    );
}

export function formatTeamChatRow(
  doc: UserFirestoreDocumentRow,
  memberUserId: string,
): {
  peerLabel: string;
  messagePreview: string;
  lastActivityLabel: string;
} {
  const participantIds = Array.isArray(doc.data.participantIds) ?
      doc.data.participantIds.map(String)
    : [];
  const peerTitles = readRecord(doc.data.peerTitles);
  const peerId = participantIds.find((id) => id !== memberUserId);
  const peerLabel =
    peerId ? readString(peerTitles[peerId]) || peerId : doc.documentId;

  return {
    peerLabel,
    messagePreview: readString(doc.data.lastMessageText) || "No messages yet",
    lastActivityLabel: formatDateTimeLabel(
      doc.data.lastMessageAt ?? doc.data.updatedAt,
    ),
  };
}

export function parseTeamMemberDetail(
  member: UserFirestoreDocumentRow,
  relatedDocuments: UserFirestoreDocumentRow[],
): ParsedTeamMemberDetail {
  const riders = relatedDocuments.filter(
    (doc) => doc.collectionId === "riders",
  );
  const presenceDocs = relatedDocuments.filter(
    (doc) => doc.collectionId === "team_presence",
  );
  const invites = relatedDocuments.filter(
    (doc) => doc.collectionId === "team_invites",
  );
  const remittances = relatedDocuments.filter(
    (doc) => doc.collectionId === "rider_cash_remittances",
  );
  const teamChats = relatedDocuments.filter(
    (doc) => doc.collectionId === "team_chats",
  );

  const parsedMember = parseTeamMemberListRow(member, riders, presenceDocs);
  const rider = findRiderForMember(member, riders);
  const presence = findPresenceForMember(member, presenceDocs);
  const location = readRecord(rider?.data.lastLocation);
  const quota = readRecord(rider?.data.quota);
  const stats = readRecord(rider?.data.currentStats);
  const locationMs = timestampMs(location.updatedAt);

  return {
    member: parsedMember,
    presenceLastSeenLabel: formatDateTimeLabel(presence?.data.lastSeenAt),
    riderDoc: rider,
    riderProfile:
      rider ?
        {
          phone: readString(rider.data.phone) || "—",
          vehicle: readString(rider.data.vehicle) || "Fleet rider",
          status: readString(rider.data.status) || "—",
          maxDeliveries: Number(quota.maxDeliveries) || 0,
          maxContainers: Number(quota.maxContainers) || 0,
          deliveriesToday: Number(stats.deliveriesToday) || 0,
          containersToday: Number(stats.containersToday) || 0,
          gpsLabel:
            locationMs ?
              `Live GPS · ${relativeTimeLabel(location.updatedAt)}`
            : "No GPS yet",
          locationLabel:
            location.latitude && location.longitude ?
              `${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}`
            : "—",
        }
      : null,
    invites: teamInvitesForMember(member, invites),
    remittances: remittancesForMember(member, rider, remittances),
    teamChats: teamChatsForMember(member, teamChats),
  };
}

export function formatInviteStatus(doc: UserFirestoreDocumentRow): string {
  return readString(doc.data.status).replaceAll("_", " ") || "Unknown";
}

export function formatRemittanceRow(doc: UserFirestoreDocumentRow): {
  dateLabel: string;
  amountLabel: string;
  ordersLabel: string;
} {
  const data = doc.data;
  const dateValue = data.remittanceDate ?? data.acceptedAt ?? data.createdAt;
  return {
    dateLabel: formatDateTimeLabel(dateValue),
    amountLabel: `₱${(Number(data.amountAccepted) || 0).toLocaleString("en-PH")}`,
    ordersLabel: `${Number(data.recordedFromOrders) || 0} orders`,
  };
}
