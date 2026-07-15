import { describe, expect, it } from "vitest";
import {
  detectPlaybackProvider,
  normalizePlaybackInput,
  toEmbedPlaybackUrl,
} from "@/features/events-training/lib/playback-input";

describe("playback-input", () => {
  it("extracts iframe src from embed HTML", () => {
    expect(
      normalizePlaybackInput(
        `<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>`,
      ),
    ).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("builds embed URLs for youtube, loom, and vimeo", () => {
    expect(
      toEmbedPlaybackUrl(
        "youtube",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      ),
    ).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");

    expect(
      toEmbedPlaybackUrl(
        "loom",
        "https://www.loom.com/share/a3bec35713084f589051559e449db2f8",
      ),
    ).toBe("https://www.loom.com/embed/a3bec35713084f589051559e449db2f8");

    expect(
      toEmbedPlaybackUrl("vimeo", "https://vimeo.com/123456789"),
    ).toBe("https://player.vimeo.com/video/123456789");
  });

  it("detects provider from URL", () => {
    expect(detectPlaybackProvider("https://www.loom.com/embed/abc")).toBe(
      "loom",
    );
  });
});
