import { appLabel } from "@/lib/admin/users";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

const ROOT_FIELD_ORDER = [
  "displayName",
  "fullName",
  "email",
  "phone",
  "birthday",
  "photoURL",
  "onboardingComplete",
  "uid",
  "createdAt",
  "updatedAt",
] as const;

const ROOT_SKIP_FIELDS = new Set(["appAccess"]);

const SUBCOLLECTION_LABELS: Record<string, string> = {
  login_events: "Login activity",
  profile: "Extended profile",
};

export function humanizeFieldKey(key: string): string {
  const labels: Record<string, string> = {
    displayName: "Display name",
    fullName: "Full name",
    photoURL: "Profile photo",
    avatarUrl: "Profile photo",
    onboardingComplete: "Onboarding",
    createdAt: "Created",
    updatedAt: "Updated",
    businessId: "Workspace ID",
    accessRevoked: "Access revoked",
    appId: "Application",
  };
  if (labels[key]) return labels[key];
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (char) => char.toUpperCase())
    .trim();
}

export function formatProfileTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatProfileScalar(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const asDate = formatProfileTimestamp(value);
    if (asDate && /^\d{4}-\d{2}-\d{2}/.test(value)) return asDate;
    return value;
  }
  return null;
}

export function profilePhotoFromData(
  data: Record<string, unknown> | undefined,
): string | undefined {
  if (!data) return undefined;
  for (const key of ["photoURL", "avatarUrl", "avatarURL"] as const) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function profileNameFromData(
  data: Record<string, unknown> | undefined,
): string | undefined {
  if (!data) return undefined;
  for (const key of ["displayName", "fullName", "name", "email"] as const) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export type ProfileField = {
  key: string;
  label: string;
  value: unknown;
  kind: "text" | "boolean" | "photo" | "timestamp";
};

export function extractRootProfileFields(
  data: Record<string, unknown>,
): ProfileField[] {
  const fields: ProfileField[] = [];
  const seen = new Set<string>();

  for (const key of ROOT_FIELD_ORDER) {
    if (ROOT_SKIP_FIELDS.has(key) || !(key in data)) continue;
    seen.add(key);
    fields.push({
      key,
      label: humanizeFieldKey(key),
      value: data[key],
      kind:
        key === "photoURL" ? "photo"
        : key === "onboardingComplete" || typeof data[key] === "boolean" ?
          "boolean"
        : key === "createdAt" || key === "updatedAt" ? "timestamp"
        : "text",
    });
  }

  for (const key of Object.keys(data).sort()) {
    if (seen.has(key) || ROOT_SKIP_FIELDS.has(key)) continue;
    const value = data[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "object") continue;
    fields.push({
      key,
      label: humanizeFieldKey(key),
      value,
      kind:
        typeof value === "boolean" ? "boolean"
        : key.toLowerCase().includes("at") ? "timestamp"
        : "text",
    });
  }

  return fields;
}

export type AppAccessProfileEntry = {
  appId: string;
  appName: string;
  role?: string;
  businessId?: string;
  onboardingComplete?: boolean;
  accessRevoked?: boolean;
};

export function extractAppAccess(
  data: Record<string, unknown>,
): AppAccessProfileEntry[] {
  if (!Array.isArray(data.appAccess)) return [];

  return data.appAccess
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const entry = row as Record<string, unknown>;
      const appId = String(entry.appId || "").trim() || "unknown";
      return {
        appId,
        appName: appLabel(appId),
        role: typeof entry.role === "string" ? entry.role : undefined,
        businessId:
          typeof entry.businessId === "string" ? entry.businessId : undefined,
        onboardingComplete:
          typeof entry.onboardingComplete === "boolean" ?
            entry.onboardingComplete
          : undefined,
        accessRevoked: entry.accessRevoked === true,
      };
    });
}

export function subcollectionSectionTitle(
  collectionId: string,
  documentId: string,
): { title: string; subtitle?: string } {
  const title = SUBCOLLECTION_LABELS[collectionId] ?? humanizeFieldKey(collectionId);
  const subtitle =
    documentId !== "main" && documentId.length < 40 ? documentId : undefined;
  return { title, subtitle };
}

export function extractDocumentFields(
  data: Record<string, unknown>,
): ProfileField[] {
  const fields: ProfileField[] = [];

  for (const key of Object.keys(data).sort()) {
    const value = data[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "object") continue;

    fields.push({
      key,
      label: humanizeFieldKey(key),
      value,
      kind:
        typeof value === "boolean" ? "boolean"
        : key.toLowerCase().includes("at") ? "timestamp"
        : key === "photoURL" || key === "avatarUrl" ? "photo"
        : "text",
    });
  }

  return fields;
}

export function splitUserDocuments(documents: UserFirestoreDocumentRow[]): {
  root: UserFirestoreDocumentRow | null;
  subdocuments: UserFirestoreDocumentRow[];
  loginEvents: UserFirestoreDocumentRow[];
  otherSubdocuments: UserFirestoreDocumentRow[];
} {
  const root = documents.find((doc) => doc.isRoot) ?? null;
  const subdocuments = documents.filter((doc) => !doc.isRoot);
  const loginEvents = subdocuments
    .filter((doc) => doc.collectionId === "login_events")
    .sort((a, b) => b.documentId.localeCompare(a.documentId));
  const otherSubdocuments = subdocuments.filter(
    (doc) => doc.collectionId !== "login_events",
  );
  return { root, subdocuments, loginEvents, otherSubdocuments };
}

export function formatLoginEventKind(kind?: string): string {
  if (!kind) return "Unknown";
  const labels: Record<string, string> = {
    explicit_login: "Sign-in",
    cached_api_access: "Cached session",
    routine_api_access: "API access",
  };
  return labels[kind] ?? kind.replace(/_/g, " ");
}

export function formatAppAccessSummary(entry: AppAccessProfileEntry): string {
  const parts: string[] = [];
  if (entry.role) {
    parts.push(entry.role.charAt(0).toUpperCase() + entry.role.slice(1));
  }
  parts.push(entry.accessRevoked ? "Revoked" : "Active");
  if (entry.onboardingComplete !== undefined) {
    parts.push(entry.onboardingComplete ? "Onboarding complete" : "Onboarding pending");
  }
  if (entry.businessId) {
    parts.push(`Workspace ${entry.businessId}`);
  }
  return parts.join(" · ");
}

export function loginEventSummary(data: Record<string, unknown>): string {
  const kind = formatLoginEventKind(
    typeof data.kind === "string" ? data.kind : undefined,
  );
  const appId = typeof data.appId === "string" ? data.appId : "unknown";
  const day =
    typeof data.calendarDayUtc === "string" ? data.calendarDayUtc : undefined;
  return `${kind} · ${appId}${day ? ` · ${day}` : ""}`;
}

export const PROFILE_FIELD_ICONS: Record<string, string> = {
  displayName: "user",
  fullName: "user",
  email: "mail",
  phone: "phone",
  birthday: "calendar",
  photoURL: "image",
  onboardingComplete: "check",
  uid: "fingerprint",
  createdAt: "clock",
  updatedAt: "clock",
};
