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

export function detectPlaybackProvider(
  urlOrEmbed: string,
): "youtube" | "loom" | "vimeo" | "other" {
  const url = normalizePlaybackInput(urlOrEmbed).toLowerCase();
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("loom.com")) return "loom";
  if (url.includes("vimeo.com")) return "vimeo";
  return "other";
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function extractLoomId(url: string): string | null {
  const match = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(
    /vimeo\.com\/(?:video\/)?(\d+)|player\.vimeo\.com\/video\/(\d+)/,
  );
  return match?.[1] ?? match?.[2] ?? null;
}

/**
 * Converts a watch/share/embed URL into an iframe-ready embed URL.
 * Returns null when the provider/url can't be embedded safely.
 */
export function toEmbedPlaybackUrl(
  provider: "youtube" | "loom" | "vimeo" | "other",
  playbackUrl: string,
): string | null {
  const url = normalizePlaybackInput(playbackUrl);
  if (!url) return null;

  const resolved =
    provider === "other" ? detectPlaybackProvider(url) : provider;

  if (resolved === "youtube") {
    const id = extractYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (resolved === "loom") {
    const id = extractLoomId(url);
    if (id) return `https://www.loom.com/embed/${id}`;
    if (url.includes("/embed/")) return url;
    return null;
  }

  if (resolved === "vimeo") {
    const id = extractVimeoId(url);
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }

  return null;
}
