import { describe, expect, it } from "vitest";
import {
  groupBusinessOtherInfoFields,
  isBusinessOtherInfoNoiseField,
  splitBusinessRootFields,
} from "@/lib/admin/business-profile-display";
import type { ProfileField } from "@/lib/admin/user-profile-display";

describe("business-profile-display other info filtering", () => {
  it("flags customer email sent idempotency keys as noise", () => {
    expect(isBusinessOtherInfoNoiseField("customerEmailSentFlags")).toBe(true);
    expect(
      isBusinessOtherInfoNoiseField(
        "customerEmailSentFlags.order_received:TX260618QTHR",
      ),
    ).toBe(true);
    expect(
      isBusinessOtherInfoNoiseField("morningBriefEmailLastSentDate"),
    ).toBe(true);
    expect(isBusinessOtherInfoNoiseField("containerOperatingMode")).toBe(true);
  });

  it("keeps operational other-info fields", () => {
    expect(isBusinessOtherInfoNoiseField("allowManualTransactionReference")).toBe(
      false,
    );
    expect(isBusinessOtherInfoNoiseField("banner")).toBe(false);
    expect(isBusinessOtherInfoNoiseField("containerDefaultPolicy")).toBe(false);
    expect(isBusinessOtherInfoNoiseField("onboardingComplete")).toBe(false);
    expect(isBusinessOtherInfoNoiseField("createdAt")).toBe(false);
  });

  it("excludes noise from otherFields while keeping useful metadata", () => {
    const { primaryFields, otherFields } = splitBusinessRootFields({
      name: "Aqua Station",
      email: "owner@example.com",
      onboardingComplete: false,
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-09-08T07:13:00.000Z",
      allowManualTransactionReference: false,
      banner: "",
      containerDefaultPolicy: "wrs_rotation",
      containerOperatingMode: "wrs_rotation_only",
      "customerEmailSentFlags.order_received:TX260618QTHR": true,
      "customerEmailSentFlags.order_received:TX26062245YY": true,
      morningBriefEmailLastSentDate: "2026-09-08",
      gettingStarted: { verifyEmail: true },
    });

    expect(primaryFields.map((f) => f.key).sort()).toEqual(["email", "name"]);
    expect(otherFields.map((f) => f.key).sort()).toEqual([
      "allowManualTransactionReference",
      "banner",
      "containerDefaultPolicy",
      "createdAt",
      "onboardingComplete",
      "updatedAt",
    ]);
  });

  it("groups other info into record, portal, containers, and riders", () => {
    const fields: ProfileField[] = [
      { key: "riderCommissionEnabled", label: "Rider commission", value: true, kind: "boolean" },
      { key: "onboardingComplete", label: "Onboarding", value: false, kind: "boolean" },
      { key: "banner", label: "Banner", value: "", kind: "text" },
      { key: "containerDefaultPolicy", label: "Policy", value: "wrs_rotation", kind: "text" },
      { key: "createdAt", label: "Created", value: "2026-05-19T00:00:00.000Z", kind: "timestamp" },
      { key: "qrWalkInEnabled", label: "QR walk-in", value: true, kind: "boolean" },
      { key: "multiRiderAssignEnabled", label: "Multi assign", value: true, kind: "boolean" },
      { key: "mysteryFlag", label: "Mystery", value: true, kind: "boolean" },
    ];

    const groups = groupBusinessOtherInfoFields(fields);
    expect(groups.map((g) => g.id)).toEqual([
      "record",
      "portal",
      "containers",
      "riders",
      "more",
    ]);
    expect(groups.find((g) => g.id === "record")?.fields.map((f) => f.key)).toEqual([
      "onboardingComplete",
      "createdAt",
    ]);
    expect(groups.find((g) => g.id === "riders")?.fields.map((f) => f.key)).toEqual([
      "riderCommissionEnabled",
      "multiRiderAssignEnabled",
    ]);
    expect(groups.find((g) => g.id === "more")?.fields.map((f) => f.key)).toEqual([
      "mysteryFlag",
    ]);
  });
});
