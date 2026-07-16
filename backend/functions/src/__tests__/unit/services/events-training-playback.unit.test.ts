import {
  extractPlaybackId,
  normalizePlaybackInput,
} from "../../../services/events-training/events-training-playback";

describe("events-training-playback", () => {
  it("extracts YouTube video id from watch URL", () => {
    expect(
      extractPlaybackId("youtube", "https://www.youtube.com/watch?v=abc12345678"),
    ).toBe("abc12345678");
  });

  it("extracts YouTube video id from embed URL", () => {
    expect(
      extractPlaybackId(
        "youtube",
        "https://www.youtube.com/embed/SGLIg-24ee4?si=dYT-VKHZK2RBQB8C",
      ),
    ).toBe("SGLIg-24ee4");
  });

  it("extracts YouTube video id from iframe embed HTML", () => {
    const embed = "<iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/SGLIg-24ee4?si=dYT-VKHZK2RBQB8C\" title=\"YouTube video player\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen></iframe>";
    expect(extractPlaybackId("youtube", embed)).toBe("SGLIg-24ee4");
  });

  it("normalizes iframe paste to src URL", () => {
    const embed = "<iframe src=\"https://www.youtube.com/embed/SGLIg-24ee4\" allowfullscreen></iframe>";
    expect(normalizePlaybackInput(embed)).toBe(
      "https://www.youtube.com/embed/SGLIg-24ee4",
    );
  });

  it("leaves plain URLs unchanged", () => {
    expect(
      normalizePlaybackInput("https://www.youtube.com/watch?v=abc12345678"),
    ).toBe("https://www.youtube.com/watch?v=abc12345678");
  });
});
