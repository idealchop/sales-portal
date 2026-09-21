import type { AdminCatalogCollectionId } from "@/lib/admin/catalog-collections";
import {
  emptyPlanLimitationsForm,
  planLimitationsFormFromFirestore,
  planLimitationsToFirestore,
  validatePlanLimitationsForm,
  type PlanLimitationsFormValues,
} from "@/lib/admin/plan-limitations-form";
import { defaultPlanSortOrder } from "@/lib/admin/plan-catalog-display";
import { ADDON_PRESETS } from "@/lib/admin/catalog-offer-display";
import {
  lookupSubscriptionPlanCatalogRow,
  SUBSCRIPTION_PLAN_CATALOG_HINT,
} from "@/lib/admin/subscription-plans-catalog";

export type PlanCapabilitiesForm = {
  map: "full" | "locate_only";
  teamHub: boolean;
  teamHubAdmins: boolean;
  directoryStaff: boolean;
  scalePlatform: boolean;
  qrPortal: boolean;
  riverAiBuddy: boolean;
  selfServe: boolean;
  showOnPricing: boolean;
};

export type PlanFormValues = {
  documentId: string;
  name: string;
  code: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  isActive: boolean;
  sortOrder: string;
  effectiveAt: string;
  capabilities: PlanCapabilitiesForm;
  limitations: PlanLimitationsFormValues;
};

export type TrialPolicyFormValues = {
  documentId: string;
  enabled: boolean;
  durationDays: string;
  basedOnPlanCode: string;
  fallbackPlanCode: string;
  teamChatPreviewDays: string;
  pauseAllowed: boolean;
  oneTrialPerBusiness: boolean;
  isActive: boolean;
  effectiveAt: string;
  riverAiChatMax: string;
  riverAiAttachmentsMax: string;
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
  ownerUserId: string;
  commissionType: "percentage" | "fixed_per_conversion";
  commissionValue: string;
  payoutCurrency: string;
};

export type ProductIconFormValues = {
  documentId: string;
  name: string;
  imageUrl: string;
  lucide: string;
  sortOrder: string;
  active: boolean;
  /** Gallon, bottle, or other refill container artwork (not a store accessory). */
  waterContainer: boolean;
};

export type CatalogFormValues =
  | { collectionId: "subscription_plans"; values: PlanFormValues }
  | { collectionId: "subscription_addons"; values: AddonFormValues }
  | {
      collectionId: "vouchers_affiliates";
      values: VoucherAffiliateFormValues;
    }
  | { collectionId: "product_icons"; values: ProductIconFormValues }
  | { collectionId: "subscription_trial_policy"; values: TrialPolicyFormValues };

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

function emptyCapabilities(): PlanCapabilitiesForm {
  return {
    map: "locate_only",
    teamHub: false,
    teamHubAdmins: false,
    directoryStaff: false,
    scalePlatform: false,
    qrPortal: false,
    riverAiBuddy: false,
    selfServe: true,
    showOnPricing: true,
  };
}

function emptyPlanForm(): PlanFormValues {
  return {
    documentId: "",
    name: "",
    code: "",
    description: "",
    monthlyPrice: "",
    yearlyPrice: "",
    isActive: true,
    sortOrder: "100",
    effectiveAt: "",
    capabilities: emptyCapabilities(),
    limitations: emptyPlanLimitationsForm(),
  };
}

function emptyTrialPolicyForm(): TrialPolicyFormValues {
  return {
    documentId: "current",
    enabled: true,
    durationDays: "15",
    basedOnPlanCode: "scale",
    fallbackPlanCode: "free",
    teamChatPreviewDays: "3",
    pauseAllowed: true,
    oneTrialPerBusiness: true,
    isActive: true,
    effectiveAt: "",
    riverAiChatMax: "5",
    riverAiAttachmentsMax: "5",
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
    ownerUserId: "",
    commissionType: "percentage",
    commissionValue: "",
    payoutCurrency: "PHP",
  };
}

function emptyProductIconForm(): ProductIconFormValues {
  return {
    documentId: "",
    name: "",
    imageUrl: "",
    lucide: "",
    sortOrder: "10",
    active: true,
    waterContainer: false,
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
  if (collectionId === "product_icons") {
    return { collectionId, values: emptyProductIconForm() };
  }
  if (collectionId === "subscription_trial_policy") {
    return { collectionId, values: emptyTrialPolicyForm() };
  }
  return { collectionId, values: emptyVoucherAffiliateForm() };
}

export function prefilledVoucherAffiliateForm(input: {
  kind: "voucher" | "affiliate";
  name: string;
  code?: string;
  contactEmail?: string;
  ownerUserId?: string;
  notesInternal?: string;
}): CatalogFormValues {
  const empty = emptyVoucherAffiliateForm();
  return {
    collectionId: "vouchers_affiliates",
    values: {
      ...empty,
      kind: input.kind,
      name: input.name.trim(),
      code: (input.code || "").trim().toUpperCase(),
      contactEmail: input.contactEmail?.trim() || "",
      ownerUserId: input.ownerUserId?.trim() || "",
      notesInternal: input.notesInternal?.trim() || "",
      commissionType: "percentage",
      commissionValue: input.kind === "affiliate" ? "10" : "",
      discountType: "percentage",
      discountValue: input.kind === "voucher" ? "10" : "",
    },
  };
}

function capabilitiesFromData(data: Record<string, unknown>, code: string): PlanCapabilitiesForm {
  const caps = asRecord(data.capabilities) || {};
  const grow = code === "grow" || code === "pro";
  const scale = code === "scale" || code === "enterprise";
  return {
    map:
      caps.map === "full" || caps.map === "locate_only" ?
        caps.map
      : grow || scale ? "full"
      : "locate_only",
    teamHub: typeof caps.teamHub === "boolean" ? caps.teamHub : grow || scale,
    teamHubAdmins:
      typeof caps.teamHubAdmins === "boolean" ? caps.teamHubAdmins : scale,
    directoryStaff:
      typeof caps.directoryStaff === "boolean" ? caps.directoryStaff : scale,
    scalePlatform:
      typeof caps.scalePlatform === "boolean" ? caps.scalePlatform : scale,
    qrPortal:
      typeof caps.qrPortal === "boolean" ? caps.qrPortal : code !== "free",
    riverAiBuddy:
      typeof caps.riverAiBuddy === "boolean" ? caps.riverAiBuddy : scale,
    selfServe:
      typeof caps.selfServe === "boolean" ? caps.selfServe
      : data.selfServe === false ? false
      : code !== "enterprise",
    showOnPricing:
      typeof caps.showOnPricing === "boolean" ? caps.showOnPricing
      : data.showOnPricing === false ? false
      : code !== "enterprise",
  };
}

function sourceDocumentData(data: Record<string, unknown>): Record<string, unknown> {
  const draft = asRecord(data.draft);
  return draft ? { ...data, ...draft } : data;
}

export function catalogFormValuesFromDocument(
  collectionId: AdminCatalogCollectionId,
  documentId: string,
  data: Record<string, unknown>,
): CatalogFormValues {
  const source = sourceDocumentData(data);
  if (collectionId === "subscription_plans") {
    const pricing = asRecord(source.pricing);
    const code = readString(source.code);

    return {
      collectionId,
      values: {
        documentId,
        name: readString(source.name),
        code,
        description: readString(source.description),
        monthlyPrice:
          pricing?.monthly !== undefined ? String(pricing.monthly) : "",
        yearlyPrice: pricing?.yearly !== undefined ? String(pricing.yearly) : "",
        isActive: source.isActive !== false,
        sortOrder: source.sortOrder !== undefined ? String(source.sortOrder) : "100",
        effectiveAt: toDatetimeLocal(source.effectiveAt || data.effectiveAt),
        capabilities: capabilitiesFromData(source, code),
        limitations: planLimitationsFormFromFirestore(source.limitations),
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

  if (collectionId === "product_icons") {
    return {
      collectionId,
      values: {
        documentId,
        name: readString(data.name) || documentId,
        imageUrl: readString(data.imageUrl),
        lucide: readString(data.lucide),
        sortOrder: data.sortOrder !== undefined ? String(data.sortOrder) : "10",
        active: data.active !== false,
        waterContainer: data.waterContainer === true,
      },
    };
  }

  if (collectionId === "subscription_trial_policy") {
    const overlay = asRecord(source.overlayLimitations);
    const support = asRecord(overlay?.support);
    const trial = asRecord(support?.trial);
    const chat = asRecord(trial?.chat);
    const attachments = asRecord(trial?.attachments);
    return {
      collectionId,
      values: {
        documentId,
        enabled: source.enabled !== false,
        durationDays:
          source.durationDays !== undefined ? String(source.durationDays) : "15",
        basedOnPlanCode: readString(source.basedOnPlanCode) || "scale",
        fallbackPlanCode: readString(source.fallbackPlanCode) || "free",
        teamChatPreviewDays:
          source.teamChatPreviewDays !== undefined ?
            String(source.teamChatPreviewDays)
          : "3",
        pauseAllowed: source.pauseAllowed !== false,
        oneTrialPerBusiness: source.oneTrialPerBusiness !== false,
        isActive: source.isActive !== false,
        effectiveAt: toDatetimeLocal(source.effectiveAt || data.effectiveAt),
        riverAiChatMax:
          chat?.max !== undefined ? String(chat.max) : "5",
        riverAiAttachmentsMax:
          attachments?.max !== undefined ? String(attachments.max) : "5",
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
      ownerUserId: readString(data.ownerUserId),
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
    description: values.description.trim() || undefined,
    pricing: {
      monthly: readNumber(values.monthlyPrice) ?? 0,
      yearly: readNumber(values.yearlyPrice) ?? 0,
    },
    limitations: planLimitationsToFirestore(values.limitations),
    isActive: values.isActive,
    sortOrder: readNumber(values.sortOrder) ?? 100,
    selfServe: values.capabilities.selfServe,
    showOnPricing: values.capabilities.showOnPricing,
    capabilities: values.capabilities,
    effectiveAt: fromDatetimeLocal(values.effectiveAt),
  };
}

function buildTrialPolicyPayload(
  values: TrialPolicyFormValues,
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  const chatMax = readNumber(values.riverAiChatMax) ?? 5;
  const attachMax = readNumber(values.riverAiAttachmentsMax) ?? 5;
  return {
    ...existing,
    enabled: values.enabled,
    durationDays: readNumber(values.durationDays) ?? 15,
    basedOnPlanCode: values.basedOnPlanCode.trim().toLowerCase() || "scale",
    fallbackPlanCode: values.fallbackPlanCode.trim().toLowerCase() || "free",
    teamChatPreviewDays: readNumber(values.teamChatPreviewDays) ?? 3,
    pauseAllowed: values.pauseAllowed,
    oneTrialPerBusiness: values.oneTrialPerBusiness,
    isActive: values.isActive,
    effectiveAt: fromDatetimeLocal(values.effectiveAt),
    overlayLimitations: {
      support: {
        trial: {
          chat: { max: chatMax, frequency: "daily" },
          attachments: { enabled: true, max: attachMax, frequency: "daily" },
          agentChat: true,
        },
      },
    },
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
    ownerUserId: values.ownerUserId.trim() || undefined,
    commissionType: values.commissionType,
    commissionValue: readNumber(values.commissionValue) ?? 0,
    conversionCount: readNumber(existing?.conversionCount) ?? 0,
    pendingCommissionAmount: readNumber(existing?.pendingCommissionAmount) ?? 0,
    payoutCurrency: values.payoutCurrency.trim() || "PHP",
  };
}

function buildProductIconPayload(
  values: ProductIconFormValues,
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...existing,
    name: values.name.trim() || values.documentId.trim(),
    imageUrl: values.imageUrl.trim() || undefined,
    lucide: values.lucide.trim() || undefined,
    sortOrder: readNumber(values.sortOrder) ?? 10,
    active: values.active,
    waterContainer: values.waterContainer,
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
  if (form.collectionId === "product_icons") {
    return buildProductIconPayload(form.values, existing);
  }
  if (form.collectionId === "subscription_trial_policy") {
    return buildTrialPolicyPayload(form.values, existing);
  }
  return buildVoucherAffiliatePayload(form.values, existing);
}

function slugDocumentId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function validateCatalogForm(form: CatalogFormValues): string | null {
  if (form.collectionId === "subscription_plans") {
    const { name, code, limitations } = form.values;
    if (!name.trim()) return "Plan name is required.";
    if (!code.trim()) return "Choose a plan type.";
    if (!catalogFormDocumentId(form)) return "Plan name is required.";
    return validatePlanLimitationsForm(limitations);
  }

  if (form.collectionId === "subscription_trial_policy") {
    const { durationDays, basedOnPlanCode } = form.values;
    if (!durationDays.trim()) return "How many days should the trial last?";
    if (!basedOnPlanCode.trim()) return "Choose which plan the trial copies.";
    return null;
  }

  if (form.collectionId === "subscription_addons") {
    const { code, name } = form.values;
    if (!name.trim()) return "Add-on name is required.";
    if (!code.trim()) return "Give this add-on a short code, like EXT_RIDER.";
    return null;
  }

  if (form.collectionId === "product_icons") {
    const { name, imageUrl, lucide } = form.values;
    if (!name.trim()) return "Icon name is required.";
    if (!imageUrl.trim() && !lucide.trim()) {
      return "Add an image URL or a Lucide icon name so stations can see it.";
    }
    return null;
  }

  const { code, name, kind } = form.values;
  if (!code.trim()) return "What should people type at checkout?";
  if (!name.trim()) return "Name is required.";
  if (kind === "voucher" && !form.values.discountValue.trim()) {
    return "How much is the discount?";
  }
  if (kind === "affiliate" && !form.values.commissionValue.trim()) {
    return "How much does the partner earn?";
  }
  return null;
}

export function catalogFormDocumentId(form: CatalogFormValues): string {
  const existing = form.values.documentId.trim();
  if (existing) return existing;
  if (form.collectionId === "subscription_trial_policy") return "current";
  if (form.collectionId === "subscription_plans") {
    const code = slugDocumentId(form.values.code);
    return code ? `plan_${code}` : "";
  }
  if (form.collectionId === "subscription_addons") {
    const code = slugDocumentId(form.values.code);
    return code ? `addon_${code}` : "";
  }
  if (form.collectionId === "vouchers_affiliates") {
    const code = slugDocumentId(form.values.code);
    if (!code) return "";
    return form.values.kind === "affiliate" ? `affiliate_${code}` : `voucher_${code}`;
  }
  if (form.collectionId === "product_icons") {
    return slugDocumentId(form.values.name || form.values.documentId);
  }
  return "";
}

export function applySubscriptionPlanCatalogDefaults(
  values: PlanFormValues,
): PlanFormValues | null {
  const row = lookupSubscriptionPlanCatalogRow(values.code);
  if (!row) return null;
  return {
    ...values,
    documentId: values.documentId.trim() || `plan_${row.code}`,
    name: row.name,
    code: row.code,
    monthlyPrice: String(row.pricing.monthly),
    yearlyPrice: String(row.pricing.yearly),
    sortOrder: defaultPlanSortOrder(row.code),
    limitations: planLimitationsFormFromFirestore(row.limitations),
    capabilities: capabilitiesFromData(row as unknown as Record<string, unknown>, row.code),
  };
}

export function applyAddonPreset(values: AddonFormValues, code: string): AddonFormValues | null {
  const preset = ADDON_PRESETS.find((row) => row.code === code);
  if (!preset) return null;
  return {
    ...values,
    documentId: values.documentId.trim() || `addon_${slugDocumentId(preset.code)}`,
    code: preset.code,
    name: preset.name,
    description: preset.description,
    price: preset.price,
    unit: preset.unit,
    billingModel: preset.billingModel,
    billingInterval: preset.billingInterval,
    featureKey: preset.featureKey,
    extendsPlanLimitation: preset.extendsPlanLimitation,
    applicablePlanCodes: preset.applicablePlanCodes,
    maxUnitsPerBusiness: preset.maxUnitsPerBusiness,
    trialEligible: preset.trialEligible,
    sortOrder: preset.sortOrder,
    isActive: true,
    currency: "PHP",
  };
}

export function filledPlanFormForCode(code: string): PlanFormValues | null {
  return applySubscriptionPlanCatalogDefaults({
    ...emptyPlanForm(),
    code,
  });
}

export { SUBSCRIPTION_PLAN_CATALOG_HINT };
