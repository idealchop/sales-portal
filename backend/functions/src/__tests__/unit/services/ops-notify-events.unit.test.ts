import { describe, expect, it } from "vitest";
import {
  KEITH_ABANTE_EMAIL,
  OPS_NOTIFY_CC,
  OPS_NOTIFY_TO,
  buildOnboardingNotice,
  buildRegistrationNotice,
  buildSubscriptionReviewNotice,
  enteredSubscriptionReview,
  isNewSmartrefillRegistration,
  isOnboardingJustCompleted,
} from "../../../services/ops-notifications/ops-notify-events";

const smartrefillUser = {
  email: "owner@station.test",
  displayName: "Ana Cruz",
  appAccess: [{ appId: "smartrefill", role: "owner" }],
};

describe("ops notification events", () => {
  it("copies Jimboy, Wina, and Keith on support mail", () => {
    expect(OPS_NOTIFY_TO.email).toBe("support@riverph.com");
    expect(OPS_NOTIFY_CC.map((person) => person.email)).toEqual([
      "jimboy@smartrefill.io",
      "wina@riverph.com",
      KEITH_ABANTE_EMAIL,
    ]);
  });

  it("notifies when Smart Refill access is first granted", () => {
    expect(isNewSmartrefillRegistration(undefined, smartrefillUser)).toBe(true);
    expect(isNewSmartrefillRegistration(smartrefillUser, smartrefillUser)).toBe(false);
    expect(
      isNewSmartrefillRegistration(undefined, {
        email: "demo@smartrefill.com",
        appAccess: [{ appId: "smartrefill" }],
      }),
    ).toBe(false);
  });

  it("notifies when a station finishes onboarding", () => {
    expect(
      isOnboardingJustCompleted(
        { onboardingComplete: false, name: "Oceannus" },
        { onboardingComplete: true, name: "Oceannus", email: "a@b.com" },
        "biz-1",
      ),
    ).toBe(true);
    expect(
      isOnboardingJustCompleted(
        { onboardingComplete: true },
        { onboardingComplete: true },
        "biz-1",
      ),
    ).toBe(false);
    expect(
      isOnboardingJustCompleted(undefined, { onboardingComplete: true }, "demo_smartrefill_clone"),
    ).toBe(false);
  });

  it("notifies only when a subscription enters review", () => {
    expect(
      enteredSubscriptionReview(undefined, {
        status: "pending",
        paymentStatus: "pending_verification",
      }),
    ).toBe(true);
    expect(
      enteredSubscriptionReview(
        { status: "pending", paymentStatus: "pending_verification" },
        { status: "pending", paymentStatus: "pending_verification", receiptUrl: "x" },
      ),
    ).toBe(false);
    expect(
      enteredSubscriptionReview(undefined, {
        status: "active",
        billingCycle: "trial",
      }),
    ).toBe(false);
  });

  it("builds registration, onboarding, and review copy", () => {
    const registration = buildRegistrationNotice("uid-1", smartrefillUser);
    expect(registration.subject).toContain("Ana Cruz");
    expect(registration.text).toContain("owner@station.test");

    const onboarding = buildOnboardingNotice("biz-1", {
      name: "Oceannus",
      email: "owner@station.test",
      phone: "0917",
    });
    expect(onboarding.subject).toContain("Oceannus");
    expect(onboarding.html).not.toContain("<script>");

    const review = buildSubscriptionReviewNotice({
      businessId: "biz-1",
      subscriptionId: "sub-1",
      businessName: "Oceannus",
      ownerEmail: "owner@station.test",
      subscription: {
        planName: "Scale",
        billingCycle: "monthly",
        price: 1499,
        paymentStatus: "pending_verification",
        paymentReference: "OR-9",
      },
    });
    expect(review.subject).toContain("Scale");
    expect(review.text).toContain("pending verification");
    expect(review.text).toContain("OR-9");
  });
});
