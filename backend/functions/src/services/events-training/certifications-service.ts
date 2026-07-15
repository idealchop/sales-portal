import { FieldValue } from "firebase-admin/firestore";
import { auth, db } from "../../config/firebase-admin";
import type {
  CertTargetType,
  CertificationStatus,
} from "../../constants/events-training";
import {
  CERT_STATUSES,
  CERT_TARGET_TYPES,
} from "../../constants/events-training";
import { toIsoString } from "../sales-serializer";
import {
  buildCertificateSvg,
  formatCertificateIssueDate,
} from "./certificate-template";
import {
  certificationsCollection,
  webinarsCollection,
} from "./events-training-db";
import { uploadCertificateSvg } from "./events-training-upload-service";
import { getTutorialApp, resolvePublishAppId } from "./tutorial-apps-service";

export type CertificationRecord = {
  id: string;
  userId: string;
  businessId: string;
  /** Firestore `apps/{appId}` this certificate is issued for. */
  appId: string;
  recipientName: string;
  targetType: CertTargetType;
  targetId: string;
  title: string;
  courseName: string;
  speaker: string;
  eventStartsAt: string | null;
  issuedBy: string;
  issuedAt: string | null;
  revokedAt: string | null;
  certificateUrl: string | null;
  status: CertificationStatus;
};

function parseCertStatus(value: unknown): CertificationStatus {
  const raw = String(value || "issued").toLowerCase();
  if (raw === "active") return "issued";
  return (CERT_STATUSES as readonly string[]).includes(raw) ?
    (raw as CertificationStatus) :
    "issued";
}

function parseTargetType(value: unknown): CertTargetType {
  return typeof value === "string" &&
    (CERT_TARGET_TYPES as readonly string[]).includes(value) ?
    (value as CertTargetType) :
    "webinar_event";
}

function mapCert(id: string, data: Record<string, unknown>): CertificationRecord {
  return {
    id,
    userId: String(data.userId ?? ""),
    businessId: String(data.businessId ?? ""),
    appId: String(data.appId ?? "smartrefill").trim() || "smartrefill",
    recipientName: String(data.recipientName ?? "").trim(),
    targetType: parseTargetType(data.targetType),
    targetId: String(data.targetId ?? ""),
    title: String(data.title ?? ""),
    courseName: String(data.courseName ?? "").trim(),
    speaker: String(data.speaker ?? "").trim(),
    eventStartsAt: toIsoString(data.eventStartsAt),
    issuedBy: String(data.issuedBy ?? "system"),
    issuedAt: toIsoString(data.issuedAt),
    revokedAt: toIsoString(data.revokedAt),
    certificateUrl:
      typeof data.certificateUrl === "string" ? data.certificateUrl : null,
    status: parseCertStatus(data.status),
  };
}

type WebinarCertificateSource = {
  name: string;
  speaker: string;
  startsAt: string | null;
  appId: string | null;
  certificationEnabled: boolean;
};

async function resolveWebinarForCertificate(
  targetId: string,
): Promise<WebinarCertificateSource> {
  const id = targetId.trim();
  if (!id) throw new Error("TARGET_ID_REQUIRED");
  const snap = await webinarsCollection().doc(id).get();
  if (!snap.exists) throw new Error("WEBINAR_NOT_FOUND");
  const data = snap.data() ?? {};
  return {
    name: String(data.name ?? "").trim() || "Webinar",
    speaker: String(data.speaker ?? "").trim(),
    startsAt: toIsoString(data.startsAt),
    appId:
      typeof data.appId === "string" && data.appId.trim() ?
        data.appId.trim() :
        null,
    certificationEnabled: data.certificationEnabled === true,
  };
}

/** Enable / disable the webinar’s attendance certificate template. */
export async function setWebinarCertificateTemplate(input: {
  webinarId: string;
  enabled: boolean;
}): Promise<{ webinarId: string; certificationEnabled: boolean }> {
  const webinarId = input.webinarId.trim();
  if (!webinarId) throw new Error("TARGET_ID_REQUIRED");
  const ref = webinarsCollection().doc(webinarId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("WEBINAR_NOT_FOUND");
  await ref.set(
    {
      certificationEnabled: input.enabled === true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { webinarId, certificationEnabled: input.enabled === true };
}

export async function listCertifications(options?: {
  userId?: string;
  targetId?: string;
  status?: string;
}): Promise<CertificationRecord[]> {
  let query:
    | FirebaseFirestore.Query
    | FirebaseFirestore.CollectionReference = certificationsCollection();

  if (options?.userId?.trim()) {
    query = query.where("userId", "==", options.userId.trim());
  }
  if (options?.targetId?.trim()) {
    query = query.where("targetId", "==", options.targetId.trim());
  }

  const snap = await query.limit(200).get();
  let items = snap.docs.map((d) => mapCert(d.id, d.data()));
  // Webinar templates only — hide legacy training_video rows from ops lists.
  items = items.filter((c) => c.targetType === "webinar_event");
  if (options?.status) {
    const status = parseCertStatus(options.status);
    items = items.filter((c) => c.status === status);
  }
  return items.sort((a, b) => (b.issuedAt ?? "").localeCompare(a.issuedAt ?? ""));
}

export async function resolveCertificateRecipientName(input: {
  userId: string;
  email?: string | null;
}): Promise<string> {
  const userId = input.userId.trim();
  if (userId) {
    const userSnap = await db.collection("users").doc(userId).get();
    const data = userSnap.data() ?? {};
    for (const key of ["displayName", "fullName", "name"] as const) {
      const value = data[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    const authUser = await auth.getUser(userId).catch(() => null);
    if (authUser?.displayName?.trim()) return authUser.displayName.trim();
    if (authUser?.email?.trim()) {
      return authUser.email.split("@")[0]?.trim() || authUser.email.trim();
    }
  }
  const email = String(input.email ?? "").trim();
  if (email.includes("@")) {
    return email.split("@")[0]?.trim() || email;
  }
  if (email) return email;
  return "Attendee";
}

async function syncMemberWebinarCertificateClaim(input: {
  eventId: string;
  businessId: string;
  userId: string;
  title: string;
  speaker: string;
  eventStartsAt: string | null;
  certificateUrl: string | null;
  issuedBy: string;
}): Promise<void> {
  const businessId = input.businessId.trim();
  if (!businessId) return;
  const now = FieldValue.serverTimestamp();
  await db
    .collection("businesses")
    .doc(businessId)
    .collection("webinar_certificates")
    .doc(input.eventId)
    .set(
      {
        eventId: input.eventId,
        businessId,
        userId: input.userId,
        title: input.title,
        speaker: input.speaker,
        eventStartsAt: input.eventStartsAt,
        certificateUrl: input.certificateUrl,
        basis: "live_attendance",
        status: "issued",
        issuedBy: input.issuedBy,
        issuedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
}

export async function issueCertification(input: {
  userId: string;
  businessId?: string;
  appId?: string | null;
  recipientName?: string | null;
  /** Ignored — certificates are webinar-only. */
  targetType?: string;
  targetId: string;
  title?: string;
  issuedBy: string;
  /** Optional override; when omitted a templated SVG certificate is generated. */
  certificateUrl?: string | null;
  /**
   * Manual ops issue may turn the webinar template on.
   * Attendance awards require the template already enabled.
   */
  enableTemplateIfMissing?: boolean;
  /** Skip issue when template is disabled (attendance path). */
  requireTemplateEnabled?: boolean;
}): Promise<CertificationRecord | null> {
  if (!input.userId?.trim()) throw new Error("USER_ID_REQUIRED");
  if (!input.targetId?.trim()) throw new Error("TARGET_ID_REQUIRED");

  const recipientName = String(input.recipientName ?? "").trim();
  if (!recipientName) throw new Error("RECIPIENT_NAME_REQUIRED");

  const webinar = await resolveWebinarForCertificate(input.targetId);
  if (input.requireTemplateEnabled && !webinar.certificationEnabled) {
    return null;
  }

  const targetType: CertTargetType = "webinar_event";
  const targetId = input.targetId.trim();
  const title = (input.title?.trim() || webinar.name).trim();
  const courseName = webinar.name;
  const speaker = webinar.speaker;
  const eventStartsAt = webinar.startsAt;
  const eventDateLabel = eventStartsAt
    ? formatCertificateIssueDate(new Date(eventStartsAt))
    : formatCertificateIssueDate();

  const appId = await resolvePublishAppId(input.appId || webinar.appId);
  const app = await getTutorialApp(appId);
  const appLabel = app?.label || appId;
  const userId = input.userId.trim();
  const businessId = input.businessId?.trim() || "";

  const existing = await certificationsCollection()
    .where("userId", "==", userId)
    .where("targetId", "==", targetId)
    .limit(10)
    .get();

  const active = existing.docs.find(
    (d) => parseCertStatus(d.data()?.status) !== "revoked",
  );
  if (active) {
    let record = mapCert(active.id, active.data());
    if (!record.certificateUrl && !input.certificateUrl?.trim()) {
      const svg = await buildCertificateSvg({
        appLabel,
        appId,
        logoUrl: app?.logoUrl ?? null,
        recipientName,
        title: record.title || title,
        courseName: record.courseName || courseName,
        speaker: record.speaker || speaker,
        eventDateLabel,
        issuedAtLabel: formatCertificateIssueDate(),
        certId: record.id,
      });
      const certificateUrl = await uploadCertificateSvg({
        uid: input.issuedBy,
        certId: record.id,
        svg,
      });
      await active.ref.set(
        {
          certificateUrl,
          recipientName: record.recipientName || recipientName,
          speaker: record.speaker || speaker,
          courseName: record.courseName || courseName,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      record = { ...record, certificateUrl };
    }
    await syncMemberWebinarCertificateClaim({
      eventId: targetId,
      businessId: businessId || record.businessId,
      userId,
      title: record.courseName || record.title,
      speaker: record.speaker || speaker,
      eventStartsAt: record.eventStartsAt || eventStartsAt,
      certificateUrl: record.certificateUrl,
      issuedBy: input.issuedBy,
    }).catch((error) => {
      console.error("syncMemberWebinarCertificateClaim failed", error);
    });
    return record;
  }

  const ref = certificationsCollection().doc();
  const certId = ref.id;
  const issuedAtLabel = formatCertificateIssueDate();

  let certificateUrl = input.certificateUrl?.trim() || null;
  if (!certificateUrl) {
    const svg = await buildCertificateSvg({
      appLabel,
      appId,
      logoUrl: app?.logoUrl ?? null,
      recipientName,
      title,
      courseName,
      speaker,
      eventDateLabel,
      issuedAtLabel,
      certId,
    });
    certificateUrl = await uploadCertificateSvg({
      uid: input.issuedBy,
      certId,
      svg,
    });
  }

  const now = FieldValue.serverTimestamp();
  await ref.set({
    userId,
    businessId,
    appId,
    recipientName,
    targetType,
    targetId,
    title,
    courseName,
    speaker,
    eventStartsAt: eventStartsAt ? new Date(eventStartsAt) : null,
    issuedBy: input.issuedBy,
    issuedAt: now,
    revokedAt: null,
    certificateUrl,
    status: "issued",
    basis: "live_attendance",
    createdAt: now,
    updatedAt: now,
  });

  const enableTemplate =
    input.enableTemplateIfMissing !== false && !webinar.certificationEnabled;
  if (enableTemplate) {
    await webinarsCollection()
      .doc(targetId)
      .set(
        {
          certificationEnabled: true,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  }

  await syncMemberWebinarCertificateClaim({
    eventId: targetId,
    businessId,
    userId,
    title: courseName,
    speaker,
    eventStartsAt,
    certificateUrl,
    issuedBy: input.issuedBy,
  }).catch((error) => {
    console.error("syncMemberWebinarCertificateClaim failed", error);
  });

  const saved = await ref.get();
  return mapCert(saved.id, saved.data() ?? {});
}

/**
 * Issue a webinar certificate when attendance is marked.
 * No-op when the webinar template is disabled.
 */
export async function awardCertificateForAttendance(input: {
  userId: string;
  businessId?: string | null;
  email?: string | null;
  eventId: string;
  issuedBy: string;
}): Promise<CertificationRecord | null> {
  if (!input.userId?.trim() || !input.eventId?.trim()) return null;
  const recipientName = await resolveCertificateRecipientName({
    userId: input.userId,
    email: input.email,
  });
  try {
    return await issueCertification({
      userId: input.userId.trim(),
      businessId: input.businessId?.trim() || undefined,
      recipientName,
      targetId: input.eventId.trim(),
      issuedBy: input.issuedBy,
      enableTemplateIfMissing: false,
      requireTemplateEnabled: true,
    });
  } catch (error) {
    console.error("awardCertificateForAttendance failed", error);
    return null;
  }
}

export async function revokeCertification(
  certId: string,
  revokedBy: string,
): Promise<CertificationRecord> {
  const ref = certificationsCollection().doc(certId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("CERT_NOT_FOUND");

  await ref.update({
    status: "revoked",
    revokedAt: FieldValue.serverTimestamp(),
    revokedBy,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const updated = await ref.get();
  return mapCert(updated.id, updated.data() ?? {});
}

/** SVG preview for the webinar certificate template (not stored). */
export async function previewCertificateSvg(input: {
  appLabel: string;
  appId?: string;
  logoUrl?: string | null;
  recipientName: string;
  title?: string;
  courseName?: string;
  speaker?: string;
  eventDateLabel?: string;
  certId?: string;
  /** When set, fills webinar name / speaker / date from Firestore. */
  webinarId?: string;
}): Promise<string> {
  let logoUrl = input.logoUrl?.trim() || null;
  const appId = input.appId?.trim() || undefined;
  if (!logoUrl && appId) {
    const app = await getTutorialApp(appId);
    logoUrl = app?.logoUrl ?? null;
  }

  let courseName = (input.courseName ?? "").trim();
  let speaker = (input.speaker ?? "").trim();
  let eventDateLabel = (input.eventDateLabel ?? "").trim();
  let title = (input.title ?? "").trim();

  if (input.webinarId?.trim()) {
    const webinar = await resolveWebinarForCertificate(input.webinarId);
    if (!courseName) courseName = webinar.name;
    if (!speaker) speaker = webinar.speaker;
    if (!eventDateLabel && webinar.startsAt) {
      eventDateLabel = formatCertificateIssueDate(new Date(webinar.startsAt));
    }
    if (!title) title = webinar.name;
  }

  return buildCertificateSvg({
    appLabel: input.appLabel.trim() || "Training",
    appId,
    logoUrl,
    recipientName: input.recipientName.trim() || "Recipient name",
    title: title || courseName || "Webinar",
    courseName: courseName || "Webinar",
    speaker: speaker || "Speaker TBA",
    eventDateLabel: eventDateLabel || formatCertificateIssueDate(),
    issuedAtLabel: formatCertificateIssueDate(),
    certId: input.certId?.trim() || "preview",
  });
}
