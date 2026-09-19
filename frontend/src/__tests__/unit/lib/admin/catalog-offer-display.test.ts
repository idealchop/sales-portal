import { describe, expect, it } from "vitest";
import {
  commaListHas,
  formatAddonPlansLine,
  formatAddonPriceLine,
  formatVoucherOfferLine,
  toggleCommaValue,
} from "@/lib/admin/catalog-offer-display";

describe("catalog offer display", () => {
  it("formats recurring add-on prices and plan lists", () => {
    expect(
      formatAddonPriceLine({
        price: 299,
        billingModel: "recurring",
        billingInterval: "monthly",
      }),
    ).toBe("₱299 / mo");
    expect(
      formatAddonPlansLine({ applicablePlanCodes: ["grow", "scale"] }),
    ).toBe("Grow, Scale");
  });

  it("formats voucher percent, peso, and trial-day offers", () => {
    expect(formatVoucherOfferLine({ kind: "voucher", discountType: "percentage", discountValue: 20 })).toBe(
      "20% off",
    );
    expect(
      formatVoucherOfferLine({ kind: "voucher", discountType: "fixed_amount", discountValue: 0 }),
    ).toBe("₱0 off");
    expect(
      formatVoucherOfferLine({ kind: "voucher", discountType: "free_trial_days", discountValue: 7 }),
    ).toBe("7 extra trial days");
  });

  it("formats affiliate commission", () => {
    expect(
      formatVoucherOfferLine({
        kind: "affiliate",
        commissionType: "percentage",
        commissionValue: 10,
      }),
    ).toBe("10% commission");
  });

  it("toggles comma-separated plan codes", () => {
    expect(toggleCommaValue("grow, scale", "enterprise", true)).toBe("grow, scale, enterprise");
    expect(toggleCommaValue("grow, scale", "grow", false)).toBe("scale");
    expect(commaListHas("grow, scale", "GROW")).toBe(true);
  });
});
