/**
 * Builds Meta / email copy for webinar promotion and reminders.
 * Includes poster reference, details, register link, seats left, certificate.
 */

export type SchedulePurpose =
  | "new_webinar"
  | "upcoming_webinar"
  | "ongoing_webinar"
  | "reminder";

export type WebinarScheduleContentInput = {
  id: string;
  name: string;
  description?: string;
  speaker?: string;
  host?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  timezone?: string;
  posterUrl?: string | null;
  capacity?: number | null;
  registrationCount?: number;
  certificationEnabled?: boolean;
  status?: string;
};

export type ComposedWebinarScheduleMessage = {
  purpose: SchedulePurpose;
  subject: string;
  emailBody: string;
  metaCaption: string;
  registerUrl: string;
  posterUrl: string | null;
  seatsRemaining: number | null;
  capacity: number | null;
  certificationEnabled: boolean;
  phase: "new" | "upcoming" | "ongoing" | "completed" | "other";
  emailTemplateKey: string;
};

const APP_BASE =
  process.env.SMARTREFILL_APP_URL?.replace(/\/$/, "") ||
  "https://app.smartrefill.io";

export function buildWebinarRegisterUrl(webinarId: string): string {
  const id = webinarId.trim();
  const url = new URL(`${APP_BASE}/webinars`);
  if (id) url.searchParams.set("event", id);
  return url.toString();
}

export function seatsRemainingForWebinar(input: {
  capacity?: number | null;
  registrationCount?: number;
}): number | null {
  const capacity = input.capacity;
  if (capacity == null || !Number.isFinite(capacity) || capacity < 0) {
    return null;
  }
  const registered = Math.max(0, Number(input.registrationCount) || 0);
  return Math.max(0, capacity - registered);
}

export function detectWebinarPhase(
  input: Pick<WebinarScheduleContentInput, "startsAt" | "endsAt" | "status">,
  now = new Date(),
): ComposedWebinarScheduleMessage["phase"] {
  if (input.status === "completed" || input.status === "cancelled") {
    return "completed";
  }
  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if (startsAt && !Number.isNaN(startsAt.getTime())) {
    if (endsAt && !Number.isNaN(endsAt.getTime())) {
      if (now >= startsAt && now <= endsAt) return "ongoing";
      if (now > endsAt) return "completed";
    }
    if (now < startsAt) return "upcoming";
    if (!endsAt && now >= startsAt) return "ongoing";
  }
  return "other";
}

function formatWhen(
  startsAt: string | null | undefined,
  timezone?: string,
): string {
  if (!startsAt) return "Date TBA";
  try {
    return new Date(startsAt).toLocaleString("en-PH", {
      timeZone: timezone?.trim() || "Asia/Manila",
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return startsAt;
  }
}

function purposeCopy(purpose: SchedulePurpose): {
  subjectPrefix: string;
  lead: string;
  cta: string;
  emailTemplateKey: string;
} {
  switch (purpose) {
  case "new_webinar":
    return {
      subjectPrefix: "New webinar",
      lead: "A new Smart Refill webinar just dropped — register while seats are open.",
      cta: "Register in the Smart Refill app",
      emailTemplateKey: "webinar-new-invite",
    };
  case "upcoming_webinar":
    return {
      subjectPrefix: "Upcoming webinar",
      lead: "This webinar is coming up soon. Secure your seat or invite your team.",
      cta: "Open in Smart Refill to register or join",
      emailTemplateKey: "webinar-upcoming",
    };
  case "ongoing_webinar":
    return {
      subjectPrefix: "Live now",
      lead: "This webinar is happening now. Join from the Smart Refill app.",
      cta: "Join in Smart Refill",
      emailTemplateKey: "webinar-ongoing",
    };
  case "reminder":
  default:
    return {
      subjectPrefix: "Reminder",
      lead: "Friendly reminder about your upcoming Smart Refill webinar.",
      cta: "Open in Smart Refill",
      emailTemplateKey: "webinar-reminder",
    };
  }
}

export function composeWebinarScheduleMessage(input: {
  purpose: SchedulePurpose;
  webinar: WebinarScheduleContentInput;
}): ComposedWebinarScheduleMessage {
  const webinar = input.webinar;
  const purpose = input.purpose;
  const copy = purposeCopy(purpose);
  const name = webinar.name?.trim() || "Untitled webinar";
  const speaker = webinar.speaker?.trim() || "";
  const host = webinar.host?.trim() || "";
  const when = formatWhen(webinar.startsAt, webinar.timezone);
  const registerUrl = buildWebinarRegisterUrl(webinar.id);
  const capacity =
    webinar.capacity != null && Number.isFinite(webinar.capacity) ?
      Number(webinar.capacity) :
      null;
  const seatsRemaining = seatsRemainingForWebinar({
    capacity,
    registrationCount: webinar.registrationCount,
  });
  const certificationEnabled = webinar.certificationEnabled === true;
  const description = (webinar.description || "").trim();
  const phase = detectWebinarPhase(webinar);

  const seatsLine =
    seatsRemaining != null && capacity != null ?
      seatsRemaining === 0 ?
        `Seats: full (${capacity} capacity)` :
        `Seats left: ${seatsRemaining} of ${capacity}` :
      "Seats: open registration";
  const certLine = certificationEnabled ?
    "Certificate: yes — attend to earn a certificate" :
    "Certificate: not offered for this session";
  const speakerLine = speaker ? `Speaker: ${speaker}` : null;
  const hostLine = host && host !== speaker ? `Host: ${host}` : null;

  const details = [
    name,
    speakerLine,
    hostLine,
    `When: ${when}`,
    seatsLine,
    certLine,
    description ? description.slice(0, 280) : null,
  ]
    .filter(Boolean)
    .join("\n");

  const subject = `${copy.subjectPrefix}: ${name}`;
  const emailBody = [
    copy.lead,
    "",
    details,
    "",
    `${copy.cta}:`,
    registerUrl,
    webinar.posterUrl ? `\nPoster: ${webinar.posterUrl}` : "",
  ]
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n")
    .trim();

  const metaCaption = [
    purpose === "ongoing_webinar" ?
      "🔴 LIVE webinar" :
      purpose === "new_webinar" ?
        "✨ New webinar" :
        purpose === "upcoming_webinar" ?
          "📅 Upcoming webinar" :
          "⏰ Webinar reminder",
    "",
    name,
    speaker ? `with ${speaker}` : null,
    when,
    seatsLine,
    certLine,
    description ? `\n${description.slice(0, 180)}` : null,
    "",
    "Register / join in Smart Refill:",
    registerUrl,
  ]
    .filter((line) => line != null)
    .join("\n")
    .trim();

  return {
    purpose,
    subject,
    emailBody,
    metaCaption,
    registerUrl,
    posterUrl: webinar.posterUrl?.trim() || null,
    seatsRemaining,
    capacity,
    certificationEnabled,
    phase,
    emailTemplateKey: copy.emailTemplateKey,
  };
}

export function defaultChannelsForPurpose(
  purpose: SchedulePurpose,
): Array<"email" | "in_app" | "push" | "meta"> {
  switch (purpose) {
  case "new_webinar":
    return ["email", "meta", "in_app"];
  case "upcoming_webinar":
    return ["email", "meta", "in_app"];
  case "ongoing_webinar":
    return ["email", "in_app", "push"];
  case "reminder":
  default:
    return ["email", "in_app"];
  }
}

export function defaultAudienceForPurpose(
  purpose: SchedulePurpose,
): "registrants" | "all_members" | "purchasers" {
  switch (purpose) {
  case "new_webinar":
  case "upcoming_webinar":
    return "all_members";
  case "ongoing_webinar":
  case "reminder":
  default:
    return "registrants";
  }
}
