import { describe, expect, it } from "vitest";
import {
  buildResourceVideoShareUrl,
  resolveSmartrefillAppOrigin,
  resourceShareHint,
} from "@/features/events-training/lib/resource-share-url";

describe("resource-share-url", () => {
  it("defaults to app.smartrefill.io", () => {
    expect(resolveSmartrefillAppOrigin("")).toBe("https://app.smartrefill.io");
    expect(resolveSmartrefillAppOrigin("https://staging.example.com/")).toBe(
      "https://staging.example.com",
    );
  });

  it("builds deep links for stories and webinar recordings", () => {
    expect(
      buildResourceVideoShareUrl({
        videoId: "story-1",
        category: "wrs_stories",
        origin: "https://app.smartrefill.io",
      }),
    ).toBe("https://app.smartrefill.io/resources/wrs-stories?video=story-1");

    expect(
      buildResourceVideoShareUrl({
        videoId: "rec-9",
        category: "webinar",
        origin: "https://app.smartrefill.io",
      }),
    ).toBe("https://app.smartrefill.io/resources/webinars?video=rec-9");
  });

  it("returns null for tutorials", () => {
    expect(
      buildResourceVideoShareUrl({
        videoId: "tut-1",
        category: "tutorial",
      }),
    ).toBeNull();
  });

  it("explains when a link is not guest-ready", () => {
    expect(
      resourceShareHint({ status: "draft", visibility: "public" }),
    ).toContain("Publish");
    expect(
      resourceShareHint({ status: "published", visibility: "private" }),
    ).toContain("Public");
    expect(
      resourceShareHint({ status: "published", visibility: "public" }),
    ).toContain("Anyone");
  });
});
