import { describe, expect, it } from "vitest";
import {
  buildCertificateSvg,
  certificateSvgDataUrl,
} from "@/features/events-training/lib/certificate-template";

describe("certificate-template (frontend preview)", () => {
  it("renders a tech-style credential with QR and app logo", async () => {
    const svg = await buildCertificateSvg({
      appLabel: "River Dispatch",
      appId: "river-dispatch",
      logoDataUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      recipientName: "Alex",
      courseName: "Webinar A",
      speaker: "Jordan Lee",
      eventDateLabel: "July 1, 2026",
    });
    expect(svg).toContain("River Dispatch");
    expect(svg).toContain("Alex");
    expect(svg).toContain("Webinar A");
    expect(svg).toContain("with Jordan Lee");
    expect(svg).toContain("WHEN");
    expect(svg).toContain("skill unlocked");
    expect(svg).toContain("text-anchor=\"middle\"");
    expect(svg).toContain('href="data:image/png;base64,');
    expect(svg).not.toMatch(/Smart\s*Refill/i);
  });

  it("builds a data URL for live preview", async () => {
    const url = await certificateSvgDataUrl({
      appLabel: "Demo App",
      recipientName: "Pat",
      title: "Title",
      courseName: "Course",
    });
    expect(url.startsWith("data:image/svg+xml")).toBe(true);
    expect(decodeURIComponent(url)).toContain("Demo App");
  });
});
