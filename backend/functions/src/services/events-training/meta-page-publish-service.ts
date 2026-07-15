/**
 * Publish captions to the River community Facebook Page via Graph API.
 * Reuses SmartRefill Secret Manager ids (same GCP project).
 */

const GRAPH_API_VERSION = "v21.0";

export type MetaPagePublishResult =
  | { ok: true; postId: string }
  | { ok: false; reason: string };

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

export function readMetaPageAccessToken(): string | null {
  return readEnv("META_COMMUNITY_PAGE_ACCESS_TOKEN");
}

export function readMetaCommunityPageId(): string | null {
  return readEnv("META_COMMUNITY_PAGE_ID");
}

/**
 * Create a Page feed post (optional link / photo URL).
 */
export async function publishMetaCommunityPagePost(input: {
  message: string;
  link?: string | null;
  photoUrl?: string | null;
  accessToken?: string | null;
  pageId?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<MetaPagePublishResult> {
  const accessToken = input.accessToken ?? readMetaPageAccessToken();
  const pageId = input.pageId ?? readMetaCommunityPageId();
  const fetchFn = input.fetchImpl ?? fetch;

  if (!accessToken) {
    return { ok: false, reason: "missing_page_access_token" };
  }
  if (!pageId) {
    return { ok: false, reason: "missing_page_id" };
  }

  const message = input.message.trim();
  if (!message) {
    return { ok: false, reason: "empty_message" };
  }

  const photoUrl =
    typeof input.photoUrl === "string" && input.photoUrl.trim() ?
      input.photoUrl.trim() :
      null;
  const link =
    typeof input.link === "string" && input.link.trim() ?
      input.link.trim() :
      null;

  try {
    if (photoUrl) {
      const url = new URL(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/photos`,
      );
      url.searchParams.set("access_token", accessToken);
      const response = await fetchFn(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: photoUrl,
          caption: message,
          published: true,
        }),
      });
      const payload = (await response.json()) as {
        id?: string;
        post_id?: string;
        error?: { message?: string };
      };
      if (!response.ok || payload.error) {
        return {
          ok: false,
          reason: payload.error?.message ?? `http_${response.status}`,
        };
      }
      return {
        ok: true,
        postId: String(payload.post_id || payload.id || ""),
      };
    }

    const url = new URL(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/feed`,
    );
    url.searchParams.set("access_token", accessToken);
    const body: Record<string, string> = { message };
    if (link) body.link = link;

    const response = await fetchFn(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!response.ok || payload.error) {
      return {
        ok: false,
        reason: payload.error?.message ?? `http_${response.status}`,
      };
    }
    return { ok: true, postId: String(payload.id || "") };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}
