import {
  DEFAULT_TUTORIAL_APP_PAGES_BY_APP,
  PLAYBACK_PROVIDERS,
  TUTORIAL_APP_PAGES,
  VIDEO_CATEGORIES,
  VIDEO_STATUSES,
  VIDEO_VISIBILITY,
} from "../../../constants/events-training";

describe("events-training visibility constants", () => {
  it("only allows public, premium, and private", () => {
    expect([...VIDEO_VISIBILITY]).toEqual(["public", "premium", "private"]);
  });

  it("keeps related enums intact", () => {
    expect(VIDEO_STATUSES).toContain("published");
    expect(VIDEO_CATEGORIES).toContain("tutorial");
    expect(VIDEO_CATEGORIES).toContain("wrs_stories");
    expect(VIDEO_CATEGORIES).toEqual(
      expect.arrayContaining(["wrs_stories", "webinar", "tutorial"]),
    );
    expect(DEFAULT_TUTORIAL_APP_PAGES_BY_APP.smartrefill).toEqual([
      "dashboard",
      "transactions",
      "customers",
      "inventory",
      "accounts",
      "operations",
    ]);
    expect([...TUTORIAL_APP_PAGES]).toEqual([
      ...DEFAULT_TUTORIAL_APP_PAGES_BY_APP.smartrefill,
    ]);
    expect(PLAYBACK_PROVIDERS).toContain("youtube");
  });
});
