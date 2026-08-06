import { describe, expect, it } from "vitest";
import { promptNeedsSceneTranslation } from "../../../services/content-studio/generate-social-post";

describe("promptNeedsSceneTranslation", () => {
  it("skips translation for plain English prompts", () => {
    expect(
      promptNeedsSceneTranslation(
        "A team of happy professionals in a modern office collaborating with glasses of water.",
      ),
    ).toBe(false);
  });

  it("translates Tagalog / Filipino markers", () => {
    expect(
      promptNeedsSceneTranslation(
        "Isang masayang team sa opisina na umiinom ng tubig habang nagtatrabaho",
      ),
    ).toBe(true);
  });

  it("translates prompts with non-ASCII characters", () => {
    expect(
      promptNeedsSceneTranslation("Isang pamilya sa kusina umiinom ng tubig — masaya"),
    ).toBe(true);
  });
});
