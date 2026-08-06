import { describe, expect, it } from "vitest";
import {
  GEMINI_MODEL_CHAIN,
  getGeminiModel,
  resolveGeminiModelCandidates,
} from "../../../../services/ai/gemini-config";

describe("sales gemini-config cost defaults", () => {
  it("defaults to flash-lite (not 3.5-flash)", () => {
    expect(getGeminiModel()).toBe("gemini-2.5-flash-lite");
    expect(GEMINI_MODEL_CHAIN[0]).toBe("gemini-2.5-flash-lite");
    expect(GEMINI_MODEL_CHAIN).toContain("gemini-3.5-flash");
    expect(GEMINI_MODEL_CHAIN.indexOf("gemini-3.5-flash")).toBeGreaterThan(0);
  });

  it("keeps 3.5-flash as a later fallback candidate", () => {
    const candidates = resolveGeminiModelCandidates();
    expect(candidates[0]).toBe("gemini-2.5-flash-lite");
    expect(candidates).toContain("gemini-3.5-flash");
  });
});
