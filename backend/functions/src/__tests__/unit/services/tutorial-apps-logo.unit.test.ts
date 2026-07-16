import { describe, expect, it } from "vitest";
import { logoUrlFromAppDoc } from "../../../services/events-training/tutorial-apps-service";

describe("logoUrlFromAppDoc", () => {
  it("reads logoUrl from the apps document", () => {
    expect(
      logoUrlFromAppDoc("demo", {
        logoUrl: "https://cdn.example.com/demo.png",
      }),
    ).toBe("https://cdn.example.com/demo.png");
  });

  it("falls back to the Smart Refill app logo", () => {
    const logo = logoUrlFromAppDoc("smartrefill", {});
    expect(logo).toContain("Asset%2022.png");
  });

  it("reads nested branding.logoUrl for each app", () => {
    expect(
      logoUrlFromAppDoc("other-app", {
        branding: { logoUrl: "https://cdn.example.com/other.png" },
      }),
    ).toBe("https://cdn.example.com/other.png");
  });

  it("returns null when no logo is known", () => {
    expect(logoUrlFromAppDoc("unknown-app", { appName: "Unknown" })).toBeNull();
  });
});
