import { describe, expect, it } from "vitest";
import {
  applySubscriptionPlanCatalogDefaults,
  catalogDocumentPayloadFromForm,
  catalogFormDocumentId,
  catalogFormValuesFromDocument,
  emptyCatalogFormValues,
} from "@/lib/admin/catalog-document-forms";

describe("product icon catalog form", () => {
  it("defaults waterContainer to false on a new icon", () => {
    const form = emptyCatalogFormValues("product_icons");
    expect(form.collectionId).toBe("product_icons");
    expect(form.values.waterContainer).toBe(false);
  });

  it("reads waterContainer from Firestore and writes it back", () => {
    const form = catalogFormValuesFromDocument("product_icons", "1liter-bottle", {
      name: "1 Liter Bottle",
      imageUrl: "https://example.com/1l.svg",
      lucide: "Droplets",
      sortOrder: 10,
      active: true,
      waterContainer: true,
    });
    expect(form.collectionId).toBe("product_icons");
    expect(form.values.waterContainer).toBe(true);

    const payload = catalogDocumentPayloadFromForm(form);
    expect(payload.waterContainer).toBe(true);
    expect(payload.name).toBe("1 Liter Bottle");
  });

  it("treats missing waterContainer as false", () => {
    const form = catalogFormValuesFromDocument("product_icons", "droplets", {
      name: "Water",
      lucide: "Droplets",
      active: true,
    });
    expect(form.collectionId).toBe("product_icons");
    expect(form.values.waterContainer).toBe(false);

    const payload = catalogDocumentPayloadFromForm(form);
    expect(payload.waterContainer).toBe(false);
  });
});

describe("subscription plan catalog form", () => {
  it("fills Free catalog defaults from plan code", () => {
    const empty = emptyCatalogFormValues("subscription_plans");
    expect(empty.collectionId).toBe("subscription_plans");
    const filled = applySubscriptionPlanCatalogDefaults({
      ...empty.values,
      code: "free",
    });
    expect(filled).toMatchObject({
      documentId: "plan_free",
      name: "Free",
      code: "free",
      monthlyPrice: "0",
      yearlyPrice: "0",
      sortOrder: "0",
    });
    expect(filled?.limitations.customers).toEqual({ mode: "capped", max: "100" });
    expect(filled?.limitations.containers).toEqual({
      mode: "capped",
      max: "50",
      frequency: "daily",
    });
    expect(filled?.limitations.onlineOrders).toEqual({
      mode: "capped",
      max: "0",
      frequency: "daily",
    });
  });

  it("fills paid Starter catalog defaults", () => {
    const empty = emptyCatalogFormValues("subscription_plans");
    const filled = applySubscriptionPlanCatalogDefaults({
      ...empty.values,
      documentId: "plan_starter",
      code: "starter",
    });
    expect(filled).toMatchObject({
      documentId: "plan_starter",
      name: "Starter",
      monthlyPrice: "399",
      yearlyPrice: "3990",
    });
    expect(filled?.limitations.customers.mode).toBe("full");
    expect(filled?.limitations.containers).toEqual({
      mode: "capped",
      max: "150",
      frequency: "daily",
    });
    expect(filled?.limitations.onlineOrders.max).toBe("10");
  });

  it("writes containers onto the Firestore payload", () => {
    const empty = emptyCatalogFormValues("subscription_plans");
    const filled = applySubscriptionPlanCatalogDefaults({
      ...empty.values,
      code: "grow",
    });
    expect(filled).not.toBeNull();
    const payload = catalogDocumentPayloadFromForm({
      collectionId: "subscription_plans",
      values: filled!,
    });
    expect(payload).toMatchObject({
      name: "Grow",
      code: "grow",
      pricing: { monthly: 950, yearly: 9500 },
    });
    const limitations = payload.limitations as Record<string, unknown>;
    expect(limitations.containers).toEqual({ frequency: "daily", max: 350 });
    expect(limitations.online_orders).toEqual({ frequency: "daily", max: 25 });
  });

  it("writes capabilities onto the Firestore payload", () => {
    const empty = emptyCatalogFormValues("subscription_plans");
    const filled = applySubscriptionPlanCatalogDefaults({
      ...empty.values,
      code: "scale",
    });
    expect(filled).not.toBeNull();
    const payload = catalogDocumentPayloadFromForm({
      collectionId: "subscription_plans",
      values: filled!,
    });
    expect(payload.capabilities).toMatchObject({
      map: "full",
      teamHub: true,
      riverAiBuddy: true,
      showOnPricing: true,
    });
  });

  it("assigns plan_free when the document id is blank", () => {
    const form = emptyCatalogFormValues("subscription_plans");
    if (form.collectionId !== "subscription_plans") {
      throw new Error("expected subscription_plans form");
    }
    form.values.code = "free";
    form.values.name = "Free";
    expect(catalogFormDocumentId(form)).toBe("plan_free");
  });

  it("assigns addon and voucher ids from codes", () => {
    const addon = emptyCatalogFormValues("subscription_addons");
    if (addon.collectionId !== "subscription_addons") {
      throw new Error("expected addons form");
    }
    addon.values.code = "EXT_RIDER";
    expect(catalogFormDocumentId(addon)).toBe("addon_ext_rider");

    const voucher = emptyCatalogFormValues("vouchers_affiliates");
    if (voucher.collectionId !== "vouchers_affiliates") {
      throw new Error("expected voucher form");
    }
    voucher.values.code = "LAUNCH20";
    voucher.values.kind = "voucher";
    expect(catalogFormDocumentId(voucher)).toBe("voucher_launch20");

    voucher.values.kind = "affiliate";
    voucher.values.code = "PARTNER10";
    expect(catalogFormDocumentId(voucher)).toBe("affiliate_partner10");
  });
});

describe("trial policy catalog form", () => {
  it("defaults to a 15-day Scale trial document", () => {
    const form = emptyCatalogFormValues("subscription_trial_policy");
    expect(form.collectionId).toBe("subscription_trial_policy");
    expect(form.values.documentId).toBe("current");
    expect(form.values.durationDays).toBe("15");
    expect(form.values.basedOnPlanCode).toBe("scale");
    expect(form.values.teamChatPreviewDays).toBe("3");
  });

  it("writes overlay limits and effectiveAt", () => {
    const form = catalogFormValuesFromDocument("subscription_trial_policy", "current", {
      enabled: true,
      durationDays: 10,
      basedOnPlanCode: "grow",
      fallbackPlanCode: "free",
      teamChatPreviewDays: 5,
      pauseAllowed: true,
      oneTrialPerBusiness: true,
      isActive: true,
      effectiveAt: "2026-09-20T16:00:00.000Z",
      overlayLimitations: {
        support: { trial: { chat: { max: 2, frequency: "daily" }, attachments: { enabled: true, max: 2, frequency: "daily" }, agentChat: true } },
      },
    });
    expect(form.collectionId).toBe("subscription_trial_policy");
    const payload = catalogDocumentPayloadFromForm(form);
    expect(payload).toMatchObject({
      durationDays: 10,
      basedOnPlanCode: "grow",
      teamChatPreviewDays: 5,
    });
    expect(typeof payload.effectiveAt).toBe("string");
  });
});
