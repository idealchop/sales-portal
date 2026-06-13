import type { AdminCatalogCollectionId } from "@/lib/admin/catalog-collections";
import {
  emptyPlanLimitationsForm,
  planLimitationsFormFromFirestore,
  planLimitationsToFirestore,
  validatePlanLimitationsForm,
  type PlanLimitationsFormValues,
} from "@/lib/admin/plan-limitations-form";

export type PlanFormValues = {
  documentId: string;
  name: string;
  code: string;
  monthlyPrice: string;
  yearlyPrice: string;
  isActive: boolean;
  limitations: PlanLimitationsFormValues;
};

export type AddonFormValues = {
  documentId: string;
  code: string;
  name: string;
  description: string;
  price: string;
  unit: string;
  currency: string;
  billingModel: "one_time" | "recurring";
  billingInterval: "monthly" | "yearly";
  isActive: boolean;
  sortOrder: string;
  featureKey: string;
  extendsPlanLimitation: string;
  applicablePlanCodes: string;
  maxUnitsPerBusiness: string;
  trialEligible: boolean;
};

export type VoucherAffiliateFormValues = {
  documentId: string;
  kind: "voucher" | "affiliate";
  code: string;
  name: string;
  isActive: boolean;
  notesInternal: string;
  discountType: "percentage" | "fixed_amount" | "free_trial_days";
  discountValue: string;
  maxRedemptions: string;
  validFrom: string;
  validUntil: string;
  applicablePlanCodes: string;
  applicableBillingCycles: string;
  minSubtotal: string;
  currency: string;
  stacksWithOtherPromos: boolean;
  firstTimeSubscriberOnly: boolean;
  contactEmail: string;
  commissionType: "percentage" | "fixed_per_conversion";
  commissionValue: string;
  payoutCurrency: string;
};

export type CatalogFormValues =
  | { collectionId: "subscription_plans"; values: PlanFormValues }
  | { collectionId: "subscription_addons"; values: AddonFormValues }
  | {
      collectionId: "vouchers_affiliates";
      values: VoucherAffiliateFormValues;
    };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ?
      (value as Record<string, unknown>)
    : null;
}

function readNumber(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatList(value: unknown): string {
  return Array.isArray(value) ?
      value.map((item) => String(item).trim()).filter(Boolean).join(", ")
    : "";
}

function toDatetimeLocal(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 16);
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    const seconds = Number((value as { _seconds?: number })._seconds);
    if (!Number.isFinite(seconds)) return "";
    return new Date(seconds * 1000).toISOString().slice(0, 16);
  }
  return "";
}

function fromDatetimeLocal(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function emptyPlanForm(): PlanFormValues {
  return {
    documentId: "",
    name: "",
    code: "",
    monthlyPrice: "",
    yearlyPrice: "",
    isActive: true,
    limitations: emptyPlanLimitationsForm(),
  };
}

function emptyAddonForm(): AddonFormValues {
  return {
    documentId: "",
    code: "",
    name: "",
    description: "",
    price: "",
    unit: "1",
    currency: "PHP",
    billingModel: "recurring",
    billingInterval: "monthly",
    isActive: true,
    sortOrder: "100",
    featureKey: "",
    extendsPlanLimitation: "",
    applicablePlanCodes: "",
    maxUnitsPerBusiness: "",
    trialEligible: false,
  };
}

function emptyVoucherAffiliateForm(): VoucherAffiliateFormValues {
  return {
    documentId: "",
    kind: "voucher",
    code: "",
    name: "",
    isActive: true,
    notesInternal: "",
    discountType: "percentage",
    discountValue: "",
    maxRedemptions: "",
    validFrom: "",
    validUntil: "",
    applicablePlanCodes: "",
    applicableBillingCycles: "monthly, yearly",
    minSubtotal: "",
    currency: "PHP",
    stacksWithOtherPromos: false,
    firstTimeSubscriberOnly: false,
    contactEmail: "",
    commissionType: "percentage",
    commissionValue: "",
    payoutCurrency: "PHP",
  };
}

export function emptyCatalogFormValues(
  collectionId: AdminCatalogCollectionId,
): CatalogFormValues {
  if (collectionId === "subscription_plans") {
    return { collectionId, values: emptyPlanForm() };
  }
  if (collectionId === "subscription_addons") {
    return { collectionId, values: emptyAddonForm() };
  }
  return { collectionId, values: emptyVoucherAffiliateForm() };
}

export function catalogFormValuesFromDocument(
  collectionId: AdminCatalogCollectionId,
  documentId: string,
  data: Record<string, unknown>,
): CatalogFormValues {
  if (collectionId === "subscription_plans") {
    const pricing = asRecord(data.pricing);

    return {
      collectionId,
      values: {
        documentId,
        name: readString(data.name),
        code: readString(data.code),
        monthlyPrice:
          pricing?.monthly !== undefined ? String(pricing.monthly) : "",
        yearlyPrice: pricing?.yearly !== undefined ? String(pricing.yearly) : "",
        isActive: data.isActive !== false,
        limitations: planLimitationsFormFromFirestore(data.limitations),
      },
    };
  }

  if (collectionId === "subscription_addons") {
    const metadata = asRecord(data.metadata);
    return {
      collectionId,
      values: {
        documentId,
        code: readString(data.code),
        name: readString(data.name),
        description: readString(data.description),
        price: data.price !== undefined ? String(data.price) : "",
        unit: data.unit !== undefined ? String(data.unit) : "1",
        currency: readString(data.currency) || "PHP",
        billingModel:
          readString(data.billingModel) === "one_time" ? "one_time" : "recurring",
        billingInterval:
          readString(data.billingInterval) === "yearly" ? "yearly" : "monthly",
        isActive: data.isActive !== false,
        sortOrder: data.sortOrder !== undefined ? String(data.sortOrder) : "100",
        featureKey: readString(data.featureKey),
        extendsPlanLimitation: readString(data.extendsPlanLimitation),
        applicablePlanCodes: formatList(data.applicablePlanCodes),
        maxUnitsPerBusiness:
          data.maxUnitsPerBusiness !== undefined ?
            String(data.maxUnitsPerBusiness)
          : "",
        trialEligible: metadata?.trialEligible === true,
      },
    };
  }

  return {
    collectionId,
    values: {
      documentId,
      kind: readString(data.kind) === "affiliate" ? "affiliate" : "voucher",
      code: readString(data.code),
      name: readString(data.name),
      isActive: data.isActive !== false,
      notesInternal: readString(data.notesInternal),
      discountType:
        readString(data.discountType) === "fixed_amount" ?
          "fixed_amount"
        : readString(data.discountType) === "free_trial_days" ?
          "free_trial_days"
        : "percentage",
      discountValue:
        data.discountValue !== undefined ? String(data.discountValue) : "",
      maxRedemptions:
        data.maxRedemptions !== undefined ? String(data.maxRedemptions) : "",
      validFrom: toDatetimeLocal(data.validFrom),
      validUntil: toDatetimeLocal(data.validUntil),
      applicablePlanCodes: formatList(data.applicablePlanCodes),
      applicableBillingCycles: formatList(data.applicableBillingCycles),
      minSubtotal: data.minSubtotal !== undefined ? String(data.minSubtotal) : "",
      currency: readString(data.currency) || "PHP",
      stacksWithOtherPromos: data.stacksWithOtherPromos === true,
      firstTimeSubscriberOnly: data.firstTimeSubscriberOnly === true,
      contactEmail: readString(data.contactEmail),
      commissionType:
        readString(data.commissionType) === "fixed_per_conversion" ?
          "fixed_per_conversion"
        : "percentage",
      commissionValue:
        data.commissionValue !== undefined ? String(data.commissionValue) : "",
      payoutCurrency: readString(data.payoutCurrency) || "PHP",
    },
  };
}

function buildPlanPayload(
  values: PlanFormValues,
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...existing,
    name: values.name.trim(),
    code: values.code.trim().toLowerCase(),
    pricing: {
      monthly: readNumber(values.monthlyPrice) ?? 0,
      yearly: readNumber(values.yearlyPrice) ?? 0,
    },
    limitations: planLimitationsToFirestore(values.limitations),
    isActive: values.isActive,
  };
}

function buildAddonPayload(
  values: AddonFormValues,
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  const applicablePlanCodes = parseList(values.applicablePlanCodes);
  const metadata = { ...asRecord(existing?.metadata) };
  metadata.trialEligible = values.trialEligible;

  return {
    ...existing,
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    description: values.description.trim(),
    price: readNumber(values.price) ?? 0,
    unit: readNumber(values.unit) ?? 1,
    currency: values.currency.trim() || "PHP",
    billingModel: values.billingModel,
    billingInterval:
      values.billingModel === "recurring" ? values.billingInterval : undefined,
    isActive: values.isActive,
    sortOrder: readNumber(values.sortOrder) ?? 100,
    featureKey: values.featureKey.trim() || undefined,
    extendsPlanLimitation: values.extendsPlanLimitation.trim() || undefined,
    applicablePlanCodes:
      applicablePlanCodes.length > 0 ? applicablePlanCodes : undefined,
    maxUnitsPerBusiness:
      values.maxUnitsPerBusiness.trim() ?
        readNumber(values.maxUnitsPerBusiness)
      : undefined,
    metadata,
  };
}

function buildVoucherAffiliatePayload(
  values: VoucherAffiliateFormValues,
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    ...existing,
    kind: values.kind,
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    isActive: values.isActive,
    notesInternal: values.notesInternal.trim() || undefined,
  };

  if (values.kind === "voucher") {
    const applicablePlanCodes = parseList(values.applicablePlanCodes);
    const applicableBillingCycles = parseList(values.applicableBillingCycles);
    return {
      ...base,
      discountType: values.discountType,
      discountValue: readNumber(values.discountValue) ?? 0,
      maxRedemptions:
        values.maxRedemptions.trim() ?
          readNumber(values.maxRedemptions)
        : undefined,
      redemptionCount: readNumber(existing?.redemptionCount) ?? 0,
      validFrom: fromDatetimeLocal(values.validFrom),
      validUntil: fromDatetimeLocal(values.validUntil),
      applicablePlanCodes:
        applicablePlanCodes.length > 0 ? applicablePlanCodes : undefined,
      applicableBillingCycles:
        applicableBillingCycles.length > 0 ? applicableBillingCycles : undefined,
      minSubtotal:
        values.minSubtotal.trim() ? readNumber(values.minSubtotal) : undefined,
      currency: values.currency.trim() || "PHP",
      stacksWithOtherPromos: values.stacksWithOtherPromos,
      firstTimeSubscriberOnly: values.firstTimeSubscriberOnly,
    };
  }

  return {
    ...base,
    contactEmail: values.contactEmail.trim() || undefined,
    commissionType: values.commissionType,
    commissionValue: readNumber(values.commissionValue) ?? 0,
    conversionCount: readNumber(existing?.conversionCount) ?? 0,
    pendingCommissionAmount: readNumber(existing?.pendingCommissionAmount) ?? 0,
    payoutCurrency: values.payoutCurrency.trim() || "PHP",
  };
}

export function catalogDocumentPayloadFromForm(
  form: CatalogFormValues,
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  if (form.collectionId === "subscription_plans") {
    return buildPlanPayload(form.values, existing);
  }
  if (form.collectionId === "subscription_addons") {
    return buildAddonPayload(form.values, existing);
  }
  return buildVoucherAffiliatePayload(form.values, existing);
}

export function validateCatalogForm(form: CatalogFormValues): string | null {
  if (form.collectionId === "subscription_plans") {
    const { documentId, name, code, limitations } = form.values;
    if (!documentId.trim()) return "Document id is required.";
    if (!name.trim()) return "Plan name is required.";
    if (!code.trim()) return "Plan code is required.";
    return validatePlanLimitationsForm(limitations);
  }

  if (form.collectionId === "subscription_addons") {
    const { documentId, code, name } = form.values;
    if (!documentId.trim()) return "Document id is required.";
    if (!code.trim()) return "Add-on code is required.";
    if (!name.trim()) return "Add-on name is required.";
    return null;
  }

  const { documentId, code, name, kind } = form.values;
  if (!documentId.trim()) return "Document id is required.";
  if (!code.trim()) return "Code is required.";
  if (!name.trim()) return "Name is required.";
  if (kind === "voucher" && !form.values.discountValue.trim()) {
    return "Discount value is required for vouchers.";
  }
  if (kind === "affiliate" && !form.values.commissionValue.trim()) {
    return "Commission value is required for affiliates.";
  }
  return null;
}

export function catalogFormDocumentId(form: CatalogFormValues): string {
  return form.values.documentId.trim();
}
