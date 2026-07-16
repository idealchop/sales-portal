import type { PlaybackProvider } from "../../constants/events-training";

const YOUTUBE_ID_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /^([a-zA-Z0-9_-]{11})$/,
];

const LOOM_ID_PATTERN = /loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/;

/** Pulls `src` from an embed `<iframe…>` paste; otherwise returns the trimmed input. */
export function normalizePlaybackInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const iframeSrc = trimmed.match(
    /<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/i,
  );
  if (iframeSrc?.[1]) {
    return iframeSrc[1].trim();
  }

  return trimmed;
}

export function extractPlaybackId(
  provider: PlaybackProvider,
  url: string,
): string | null {
  const trimmed = normalizePlaybackInput(url);
  if (!trimmed) return null;

  if (provider === "youtube") {
    for (const pattern of YOUTUBE_ID_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  if (provider === "loom") {
    const match = trimmed.match(LOOM_ID_PATTERN);
    return match?.[1] ?? null;
  }

  return null;
}

export function defaultThumbnailUrl(
  provider: PlaybackProvider,
  playbackUrl: string,
  playbackId?: string | null,
): string | null {
  const id = playbackId ?? extractPlaybackId(provider, playbackUrl);
  if (provider === "youtube" && id) {
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }
  return null;
}
