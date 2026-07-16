import { VIDEO_CATEGORY_PATHS } from "./events-training-types";
import type { VideoCategory } from "./events-training-types";

const DEFAULT_SMARTREFILL_APP_ORIGIN = "https://app.smartrefill.io";

/**
 * Public Smart Refill origin for Resources deep links (social share, email, etc.).
 */
export function resolveSmartrefillAppOrigin(
  envValue = process.env.NEXT_PUBLIC_SMARTREFILL_APP_URL,
): string {
  const raw = typeof envValue === "string" ? envValue.trim() : "";
  if (!raw) return DEFAULT_SMARTREFILL_APP_ORIGIN;
  return raw.replace(/\/$/, "");
}

/** Catalog path that accepts `?video=` deep links. */
export function resourceCatalogPathForCategory(
  category: VideoCategory,
): string | null {
  if (category === "wrs_stories") return VIDEO_CATEGORY_PATHS.wrs_stories;
  if (category === "webinar") return VIDEO_CATEGORY_PATHS.webinar;
  return null;
}

/**
 * Absolute URL that opens a story / recording theater on public Resources.
 * Returns null for tutorials (dashboard-only) or missing ids.
 */
export function buildResourceVideoShareUrl(input: {
  videoId: string;
  category: VideoCategory;
  origin?: string;
}): string | null {
  const videoId = input.videoId.trim();
  if (!videoId) return null;
  const path = resourceCatalogPathForCategory(input.category);
  if (!path) return null;
  const origin = (input.origin ?? resolveSmartrefillAppOrigin()).replace(
    /\/$/,
    "",
  );
  const url = new URL(path, `${origin}/`);
  url.searchParams.set("video", videoId);
  return url.toString();
}

export function resourceShareHint(input: {
  status: string;
  visibility: string;
}): string {
  if (input.status !== "published") {
    return "Publish this video (and keep visibility Public) so guests can open the link.";
  }
  if (input.visibility !== "public") {
    return "Guests only see Public videos. Members may still need to sign in for Private or Premium.";
  }
  return "Anyone with this link can open the video on Smart Refill Resources.";
}
