import { afterEach, describe, expect, it, vi } from "vitest";
import { publishMetaCommunityPagePost } from "../../../services/events-training/meta-page-publish-service";

describe("publishMetaCommunityPagePost", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns missing token when page credentials are absent", async () => {
    const result = await publishMetaCommunityPagePost({
      message: "hello",
      accessToken: null,
      pageId: "page-1",
    });
    expect(result).toEqual({
      ok: false,
      reason: "missing_page_access_token",
    });
  });

  it("posts to Page feed with message and link", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "page-1_99" }),
    });

    const result = await publishMetaCommunityPagePost({
      message: "Webinar live",
      link: "https://app.smartrefill.io/webinars?event=abc",
      accessToken: "token",
      pageId: "page-1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual({ ok: true, postId: "page-1_99" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/page-1/feed");
    expect(url).toContain("access_token=token");
    expect(JSON.parse(String(init.body))).toEqual({
      message: "Webinar live",
      link: "https://app.smartrefill.io/webinars?event=abc",
    });
  });

  it("posts photos when posterUrl is provided", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "photo-1", post_id: "page-1_100" }),
    });

    const result = await publishMetaCommunityPagePost({
      message: "See you there",
      photoUrl: "https://cdn.example/poster.jpg",
      accessToken: "token",
      pageId: "page-1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual({ ok: true, postId: "page-1_100" });
    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url).toContain("/page-1/photos");
  });
});
