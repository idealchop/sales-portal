import { db } from "../../config/firebase-admin";
import { DEFAULT_TUTORIAL_APP_PAGES_BY_APP } from "../../constants/events-training";

export type TutorialAppOption = {
  id: string;
  label: string;
  pages: string[];
  /** Public logo URL resolved from the apps doc or known product fallback. */
  logoUrl: string | null;
};

/**
 * Known product logos when `apps/{id}` has no logo field.
 * Prefer each product’s primary app mark (not generic icons).
 */
const FALLBACK_APP_LOGOS: Record<string, string> = {
  "smartrefill":
    "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Brand%20Logo%2FAsset%2022.png?alt=media&token=f7458efe-afd7-4006-862e-40c8d524c080",
  "sales-portal":
    "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Brand%20Logo%2FLogo%20icon%203.0.png?alt=media&token=72c29968-78bb-4c40-9f86-1ea63d9f49e0",
};

const LOGO_KEY = /logo|icon|image|brand|avatar|photo/i;

function humanizeAppLabel(id: string, data: Record<string, unknown>): string {
  const name = typeof data.appName === "string" ? data.appName.trim() : "";
  if (name) return name;
  const slug = typeof data.appSlug === "string" ? data.appSlug.trim() : "";
  if (slug) return slug;
  return id;
}

function pagesFromAppDoc(id: string, data: Record<string, unknown>): string[] {
  if (Array.isArray(data.tutorialPages)) {
    return [
      ...new Set(
        data.tutorialPages
          .map(String)
          .map((page) => page.trim())
          .filter(Boolean),
      ),
    ];
  }
  const fallback = DEFAULT_TUTORIAL_APP_PAGES_BY_APP[id];
  return fallback ? [...fallback] : [];
}

function asHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

/** Collect http(s) URLs from logo-ish fields, including nested branding maps. */
function collectLogoCandidates(
  value: unknown,
  out: string[],
  depth = 0,
  keyHint = "",
): void {
  if (depth > 4 || value == null) return;

  if (typeof value === "string") {
    if (LOGO_KEY.test(keyHint) || depth === 0) {
      const url = asHttpUrl(value);
      if (url) out.push(url);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectLogoCandidates(item, out, depth + 1, keyHint);
    }
    return;
  }

  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const nextHint = LOGO_KEY.test(key) ? key : keyHint;
      // Always walk branding / identity style objects one level deeper.
      if (LOGO_KEY.test(key) || key === "branding" || key === "identity") {
        collectLogoCandidates(nested, out, depth + 1, key);
      } else if (depth === 0) {
        collectLogoCandidates(nested, out, depth + 1, nextHint);
      }
    }
  }
}

export function logoUrlFromAppDoc(
  id: string,
  data: Record<string, unknown>,
): string | null {
  const explicit = asHttpUrl(data.logoUrl) ||
    asHttpUrl(data.logo) ||
    asHttpUrl(data.appLogo) ||
    asHttpUrl(data.iconUrl) ||
    asHttpUrl(data.imageUrl) ||
    asHttpUrl(data.brandLogoUrl) ||
    asHttpUrl(data.appIconUrl) ||
    asHttpUrl(data.photoURL) ||
    asHttpUrl(data.photoUrl);

  if (explicit) return explicit;

  const nested: string[] = [];
  collectLogoCandidates(data.branding, nested, 0, "branding");
  collectLogoCandidates(data.identity, nested, 0, "identity");
  collectLogoCandidates(data, nested, 0, "");
  if (nested[0]) return nested[0];

  return FALLBACK_APP_LOGOS[id] || null;
}

function mapAppDoc(
  id: string,
  data: Record<string, unknown>,
): TutorialAppOption {
  return {
    id,
    label: humanizeAppLabel(id, data),
    pages: pagesFromAppDoc(id, data),
    logoUrl: logoUrlFromAppDoc(id, data),
  };
}

export async function listTutorialApps(): Promise<TutorialAppOption[]> {
  const snap = await db.collection("apps").get();
  return snap.docs
    .map((doc) =>
      mapAppDoc(doc.id, (doc.data() ?? {}) as Record<string, unknown>),
    )
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function getTutorialApp(
  appId: string,
): Promise<TutorialAppOption | null> {
  const id = appId.trim();
  if (!id) return null;
  const snap = await db.collection("apps").doc(id).get();
  if (!snap.exists) return null;
  return mapAppDoc(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
}

/**
 * Resolves which Firestore `apps/{id}` doc content is published for.
 * Defaults to Smart Refill when unset.
 */
export async function resolvePublishAppId(
  appId: string | null | undefined,
  fallback = "smartrefill",
): Promise<string> {
  const id = String(appId ?? "").trim() || fallback;
  const app = await getTutorialApp(id);
  if (!app) throw new Error("PUBLISH_APP_REQUIRED");
  return app.id;
}

/** Validates tutorial targeting against the Firestore `apps` collection. */
export async function resolveTutorialTargeting(
  appId: string | null | undefined,
  appPages: string[] | null | undefined,
): Promise<{ appId: string; appPages: string[] }> {
  const id = String(appId ?? "").trim();
  if (!id) throw new Error("TUTORIAL_APP_REQUIRED");

  const app = await getTutorialApp(id);
  if (!app) throw new Error("TUTORIAL_APP_REQUIRED");

  const allowed = new Set(app.pages);
  const filtered = [
    ...new Set(
      (appPages ?? [])
        .map(String)
        .map((page) => page.trim())
        .filter((page) => allowed.has(page)),
    ),
  ];
  if (filtered.length === 0) throw new Error("TUTORIAL_PAGES_REQUIRED");

  return { appId: id, appPages: filtered };
}
