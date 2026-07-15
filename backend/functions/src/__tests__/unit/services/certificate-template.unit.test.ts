import { describe, expect, it } from "vitest";
import {
  buildCertificateSvg,
  buildCertificateVerifyUrl,
  formatCertificateIssueDate,
} from "../../../services/events-training/certificate-template";

describe("certificate-template", () => {
  it("embeds selected app label, QR image, and verify payload", async () => {
    const svg = await buildCertificateSvg({
      appLabel: "Aqua Logistics",
      appId: "aqua-logistics",
      logoDataUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      recipientName: "Jane Doe",
      courseName: "Onboarding webinar",
      speaker: "Maya Cruz",
      eventDateLabel: "July 10, 2026",
      issuedAtLabel: "July 16, 2026",
      certId: "cert-123",
    });

    expect(svg).toContain("Aqua Logistics");
    expect(svg).toContain("Jane Doe");
    expect(svg).toContain("Onboarding webinar");
    expect(svg).toContain("with Maya Cruz");
    expect(svg).toContain("July 10, 2026");
    expect(svg).toContain("for attending");
    expect(svg).toContain("WHEN");
    expect(svg).toContain("skill unlocked");
    expect(svg).toContain("AWARDED TO");
    expect(svg).toContain("text-anchor=\"middle\"");
    expect(svg).toContain("href=\"data:image/png;base64,");
    expect(svg).not.toMatch(/Smart\s*Refill/i);
  });

  it("falls back to a monogram when no logo is available", async () => {
    const svg = await buildCertificateSvg({
      appLabel: "River Dispatch",
      recipientName: "Pat",
      title: "Course",
      courseName: "Module",
      issuedAtLabel: "July 16, 2026",
      certId: "x",
    });
    expect(svg).toContain(">R</text>");
  });

  it("escapes XML special characters in fields", async () => {
    const svg = await buildCertificateSvg({
      appLabel: "A & B",
      recipientName: "Tom <\"Tester\">",
      courseName: "Ops & Safety",
      speaker: "A & B Host",
      issuedAtLabel: "July 16, 2026",
      certId: "id",
    });
    expect(svg).toContain("A &amp; B");
    expect(svg).toContain("Tom &lt;&quot;Tester&quot;&gt;");
    expect(svg).toContain("Ops &amp; Safety");
    expect(svg).toContain("with A &amp; B Host");
  });

  it("builds verify URLs with cert and app ids", () => {
    expect(
      buildCertificateVerifyUrl({ certId: "abc", appId: "demo-app" }),
    ).toContain("cert=abc");
    expect(
      buildCertificateVerifyUrl({ certId: "abc", appId: "demo-app" }),
    ).toContain("app=demo-app");
    expect(
      buildCertificateVerifyUrl({
        certId: "abc",
        verifyUrl: "https://example.com/v/abc",
      }),
    ).toBe("https://example.com/v/abc");
  });

  it("formats issue dates in Asia/Manila", () => {
    const label = formatCertificateIssueDate(
      new Date("2026-07-16T04:00:00.000Z"),
    );
    expect(label).toMatch(/2026/);
    expect(label.length).toBeGreaterThan(8);
  });
});
