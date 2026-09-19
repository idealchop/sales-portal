"use client";

import { Button } from "@/components/ui/button";
import {
  CatalogCheckbox,
  CatalogField,
  CatalogFormSection,
  CatalogNumberInput,
  CatalogSelect,
  CatalogTextArea,
  CatalogTextInput,
} from "@/features/admin/components/catalog-form-primitives";
import { PlanLimitationsFormFields } from "@/features/admin/components/plan-limitations-form-fields";
import {
  applyAddonPreset,
  applySubscriptionPlanCatalogDefaults,
  SUBSCRIPTION_PLAN_CATALOG_HINT,
  type AddonFormValues,
  type CatalogFormValues,
  type PlanFormValues,
  type ProductIconFormValues,
  type TrialPolicyFormValues,
  type VoucherAffiliateFormValues,
} from "@/lib/admin/catalog-document-forms";
import { PLAN_PRESET_OPTIONS } from "@/lib/admin/plan-catalog-display";
import {
  ADDON_PRESETS,
  ADDON_UNLOCK_OPTIONS,
  addonUnlockId,
  commaListHas,
  OFFER_PLAN_OPTIONS,
  toggleCommaValue,
} from "@/lib/admin/catalog-offer-display";

function PlanFormFields({
  values,
  onChange,
  documentIdDisabled,
}: {
  values: PlanFormValues;
  onChange: (patch: Partial<PlanFormValues>) => void;
  documentIdDisabled?: boolean;
}) {
  const knownPreset = PLAN_PRESET_OPTIONS.some((option) => option.code === values.code);

  return (
    <>
      <CatalogFormSection title="What customers see">
        <p className="text-sm text-zinc-600">
          Pick a plan type to fill price and limits. Change anything you need, then publish so
          stations see it on pricing. No developer step after Publish.
        </p>
        <div className="flex flex-wrap gap-2">
          {PLAN_PRESET_OPTIONS.map((option) => {
            const selected = values.code === option.code;
            return (
              <Button
                key={option.code}
                type="button"
                size="sm"
                variant={selected ? "primary" : "outline"}
                disabled={documentIdDisabled && !selected}
                onClick={() => {
                  const next = applySubscriptionPlanCatalogDefaults({
                    ...values,
                    code: option.code,
                    documentId: documentIdDisabled ? values.documentId : "",
                  });
                  onChange(next ?? { code: option.code });
                }}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-zinc-500">{SUBSCRIPTION_PLAN_CATALOG_HINT}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField label="Plan name">
            <CatalogTextInput
              value={values.name}
              onChange={(name) => onChange({ name })}
              placeholder="Free"
            />
          </CatalogField>
          <CatalogField
            label="Plan type"
            hint={knownPreset ? undefined : "Use a short code such as starter or grow."}
          >
            {knownPreset ?
              <CatalogSelect
                value={values.code}
                onChange={(code) => {
                  const next = applySubscriptionPlanCatalogDefaults({
                    ...values,
                    code,
                    documentId: documentIdDisabled ? values.documentId : "",
                  });
                  onChange(next ?? { code });
                }}
                options={PLAN_PRESET_OPTIONS.map((option) => ({
                  value: option.code,
                  label: option.label,
                }))}
              />
            : <CatalogTextInput
                value={values.code}
                onChange={(code) => onChange({ code })}
                placeholder="starter"
              />
            }
          </CatalogField>
        </div>
        <CatalogCheckbox
          checked={values.isActive}
          onChange={(isActive) => onChange({ isActive })}
          label="Offer this plan (uncheck to hide it from new sales)"
        />
        <CatalogField
          label="Card order"
          hint="Lower numbers appear first. Free should be 0, then Starter, Grow, Scale."
        >
          <CatalogNumberInput
            value={values.sortOrder}
            min={0}
            onChange={(sortOrder) => onChange({ sortOrder })}
          />
        </CatalogField>
        <CatalogField
          label="When existing Free stations get limit changes"
          hint="Leave blank to use tonight at Manila midnight. Paid stations wait until their next billing date."
        >
          <CatalogTextInput
            value={values.effectiveAt}
            onChange={(effectiveAt) => onChange({ effectiveAt })}
            placeholder="Optional — tonight if blank"
          />
        </CatalogField>
        <CatalogField label="Short description on the pricing card">
          <CatalogTextArea
            value={values.description}
            onChange={(description) => onChange({ description })}
          />
        </CatalogField>
      </CatalogFormSection>

      <CatalogFormSection title="What this plan includes">
        <CatalogSelect
          value={values.capabilities.map}
          onChange={(map) =>
            onChange({
              capabilities: {
                ...values.capabilities,
                map: map === "full" ? "full" : "locate_only",
              },
            })
          }
          options={[
            { value: "locate_only", label: "Map: pin the station only" },
            { value: "full", label: "Map: full interactive map" },
          ]}
        />
        <CatalogCheckbox
          checked={values.capabilities.selfServe}
          onChange={(selfServe) =>
            onChange({ capabilities: { ...values.capabilities, selfServe } })
          }
          label="Stations can subscribe themselves (turn off for Contact sales / Enterprise)"
        />
        <CatalogCheckbox
          checked={values.capabilities.showOnPricing}
          onChange={(showOnPricing) =>
            onChange({ capabilities: { ...values.capabilities, showOnPricing } })
          }
          label="Show this plan on the pricing page"
        />
        <CatalogCheckbox
          checked={values.capabilities.teamHub}
          onChange={(teamHub) =>
            onChange({ capabilities: { ...values.capabilities, teamHub } })
          }
          label="Team Hub"
        />
        <CatalogCheckbox
          checked={values.capabilities.teamHubAdmins}
          onChange={(teamHubAdmins) =>
            onChange({ capabilities: { ...values.capabilities, teamHubAdmins } })
          }
          label="Team Hub admin seats"
        />
        <CatalogCheckbox
          checked={values.capabilities.directoryStaff}
          onChange={(directoryStaff) =>
            onChange({ capabilities: { ...values.capabilities, directoryStaff } })
          }
          label="Directory-only staff"
        />
        <CatalogCheckbox
          checked={values.capabilities.scalePlatform}
          onChange={(scalePlatform) =>
            onChange({ capabilities: { ...values.capabilities, scalePlatform } })
          }
          label="Scale platform tools"
        />
        <CatalogCheckbox
          checked={values.capabilities.qrPortal}
          onChange={(qrPortal) =>
            onChange({ capabilities: { ...values.capabilities, qrPortal } })
          }
          label="QR / customer portal"
        />
        <CatalogCheckbox
          checked={values.capabilities.riverAiBuddy}
          onChange={(riverAiBuddy) =>
            onChange({ capabilities: { ...values.capabilities, riverAiBuddy } })
          }
          label="River AI Buddy"
        />
      </CatalogFormSection>

      <CatalogFormSection title="Pricing">
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField label="Monthly price (₱)">
            <CatalogNumberInput
              value={values.monthlyPrice}
              min={0}
              onChange={(monthlyPrice) => onChange({ monthlyPrice })}
            />
          </CatalogField>
          <CatalogField
            label="Yearly price (₱)"
            hint="Same 16% yearly rule: 10× monthly (Starter ₱3,990, Grow ₱9,500, Scale ₱16,500)."
          >
            <CatalogNumberInput
              value={values.yearlyPrice}
              min={0}
              onChange={(yearlyPrice) => onChange({ yearlyPrice })}
            />
          </CatalogField>
        </div>
      </CatalogFormSection>

      <PlanLimitationsFormFields
        values={values.limitations}
        onChange={(limitations) => onChange({ limitations })}
      />
    </>
  );
}

function PlanCodeChecklist({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {OFFER_PLAN_OPTIONS.map((option) => (
          <CatalogCheckbox
            key={option.value}
            checked={commaListHas(value, option.value)}
            onChange={(checked) => onChange(toggleCommaValue(value, option.value, checked))}
            label={option.label}
          />
        ))}
      </div>
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function AddonFormFields({
  values,
  onChange,
  documentIdDisabled,
}: {
  values: AddonFormValues;
  onChange: (patch: Partial<AddonFormValues>) => void;
  documentIdDisabled?: boolean;
}) {
  const unlockId = addonUnlockId(values.featureKey, values.extendsPlanLimitation);

  return (
    <>
      <CatalogFormSection title="What the station can buy">
        <p className="text-sm text-zinc-600">
          Pick a common extra to fill price and limits, then change anything you need. Saving
          updates SmartRefill right away.
        </p>
        <div className="flex flex-wrap gap-2">
          {ADDON_PRESETS.map((preset) => {
            const selected = values.code === preset.code;
            return (
              <Button
                key={preset.code}
                type="button"
                size="sm"
                variant={selected ? "primary" : "outline"}
                disabled={documentIdDisabled && !selected}
                onClick={() => {
                  const next = applyAddonPreset(
                    {
                      ...values,
                      documentId: documentIdDisabled ? values.documentId : "",
                    },
                    preset.code,
                  );
                  if (next) onChange(next);
                }}
              >
                {preset.name} (₱{preset.price}/mo)
              </Button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField label="Name customers see">
            <CatalogTextInput
              value={values.name}
              onChange={(name) => onChange({ name })}
              placeholder="Extra rider"
            />
          </CatalogField>
          <CatalogField
            label="Short code"
            hint="Shown internally. Typical: EXT_RIDER, EXT_AI_BOOST, EXT_BUSINESS."
          >
            <CatalogTextInput
              value={values.code}
              onChange={(code) => onChange({ code: code.toUpperCase() })}
              placeholder="EXT_RIDER"
            />
          </CatalogField>
        </div>
        <CatalogField label="Short description">
          <CatalogTextArea
            value={values.description}
            onChange={(description) => onChange({ description })}
          />
        </CatalogField>
        <CatalogCheckbox
          checked={values.isActive}
          onChange={(isActive) => onChange({ isActive })}
          label="Offer this add-on"
        />
      </CatalogFormSection>

      <CatalogFormSection title="Price">
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField label="Price (₱)">
            <CatalogNumberInput
              value={values.price}
              min={0}
              onChange={(price) => onChange({ price })}
            />
          </CatalogField>
          <CatalogField label="How they pay">
            <CatalogSelect
              value={
                values.billingModel === "one_time" ?
                  "one_time"
                : values.billingInterval === "yearly" ?
                  "yearly"
                : "monthly"
              }
              onChange={(billing) => {
                if (billing === "one_time") {
                  onChange({ billingModel: "one_time" });
                  return;
                }
                onChange({
                  billingModel: "recurring",
                  billingInterval: billing === "yearly" ? "yearly" : "monthly",
                });
              }}
              options={[
                { value: "monthly", label: "Every month" },
                { value: "yearly", label: "Every year" },
                { value: "one_time", label: "One-time" },
              ]}
            />
          </CatalogField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField
            label="How many this purchase adds"
            hint="Usually 1 rider seat or 1 extra station."
          >
            <CatalogNumberInput
              value={values.unit}
              min={1}
              onChange={(unit) => onChange({ unit })}
            />
          </CatalogField>
          <CatalogField
            label="Max a station can buy"
            hint="Leave blank for no cap."
          >
            <CatalogNumberInput
              value={values.maxUnitsPerBusiness}
              min={0}
              onChange={(maxUnitsPerBusiness) => onChange({ maxUnitsPerBusiness })}
            />
          </CatalogField>
        </div>
      </CatalogFormSection>

      <CatalogFormSection title="Who can buy it">
        <CatalogField label="What this add-on unlocks">
          <CatalogSelect
            value={unlockId}
            onChange={(next) => {
              const option = ADDON_UNLOCK_OPTIONS.find((row) => row.id === next);
              onChange({
                featureKey: option?.featureKey ?? "",
                extendsPlanLimitation: option?.extendsPlanLimitation ?? "",
              });
            }}
            options={ADDON_UNLOCK_OPTIONS.map((option) => ({
              value: option.id,
              label: option.label,
            }))}
          />
        </CatalogField>
        {unlockId === "custom" ?
          <div className="grid gap-3 sm:grid-cols-2">
            <CatalogField label="Feature key" hint="Only if engineering asked you for a specific key.">
              <CatalogTextInput
                value={values.featureKey}
                onChange={(featureKey) => onChange({ featureKey })}
                placeholder="rider_slot"
              />
            </CatalogField>
            <CatalogField label="Plan limit it extends">
              <CatalogTextInput
                value={values.extendsPlanLimitation}
                onChange={(extendsPlanLimitation) => onChange({ extendsPlanLimitation })}
                placeholder="staff_rider"
              />
            </CatalogField>
          </div>
        : null}
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Available on these plans</p>
          <PlanCodeChecklist
            value={values.applicablePlanCodes}
            onChange={(applicablePlanCodes) => onChange({ applicablePlanCodes })}
            hint="Usually Grow and Scale. Leave Free and Starter off."
          />
        </div>
        <CatalogCheckbox
          checked={values.trialEligible}
          onChange={(trialEligible) => onChange({ trialEligible })}
          label="Stations on trial can buy this"
        />
        <CatalogField label="List order" hint="Lower numbers appear first.">
          <CatalogNumberInput
            value={values.sortOrder}
            min={0}
            onChange={(sortOrder) => onChange({ sortOrder })}
          />
        </CatalogField>
      </CatalogFormSection>
    </>
  );
}

function VoucherAffiliateFormFields({
  values,
  onChange,
}: {
  values: VoucherAffiliateFormValues;
  onChange: (patch: Partial<VoucherAffiliateFormValues>) => void;
  documentIdDisabled?: boolean;
}) {
  const discountHint =
    values.discountType === "fixed_amount" ?
      "Amount in pesos. 0 can mean they pay nothing."
    : values.discountType === "free_trial_days" ?
      "How many extra trial days this code adds."
    : "20 means 20% off.";

  return (
    <>
      <CatalogFormSection title="What this is">
        <p className="text-sm text-zinc-600">
          A voucher is a checkout code for stations. An affiliate is a partner referral code and
          the commission they earn. Saving updates SmartRefill right away.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={values.kind === "voucher" ? "primary" : "outline"}
            onClick={() => onChange({ kind: "voucher" })}
          >
            Voucher
          </Button>
          <Button
            type="button"
            size="sm"
            variant={values.kind === "affiliate" ? "primary" : "outline"}
            onClick={() => onChange({ kind: "affiliate" })}
          >
            Affiliate
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField label="Name">
            <CatalogTextInput
              value={values.name}
              onChange={(name) => onChange({ name })}
              placeholder={values.kind === "affiliate" ? "River partner" : "Launch 20"}
            />
          </CatalogField>
          <CatalogField
            label={values.kind === "affiliate" ? "Referral code" : "Code customers type"}
            hint="Uppercase letters and numbers. This is what they enter at checkout."
          >
            <CatalogTextInput
              value={values.code}
              onChange={(code) => onChange({ code: code.toUpperCase() })}
              placeholder={values.kind === "affiliate" ? "PARTNER10" : "LAUNCH20"}
            />
          </CatalogField>
        </div>
        <CatalogField label="Internal notes" hint="Only sales sees this.">
          <CatalogTextArea
            value={values.notesInternal}
            onChange={(notesInternal) => onChange({ notesInternal })}
          />
        </CatalogField>
        <CatalogCheckbox
          checked={values.isActive}
          onChange={(isActive) => onChange({ isActive })}
          label={values.kind === "affiliate" ? "This partner is active" : "This voucher is active"}
        />
      </CatalogFormSection>

      {values.kind === "voucher" ?
        <CatalogFormSection title="The discount">
          <div className="grid gap-3 sm:grid-cols-2">
            <CatalogField label="Discount type">
              <CatalogSelect
                value={values.discountType}
                onChange={(discountType) =>
                  onChange({
                    discountType:
                      discountType as VoucherAffiliateFormValues["discountType"],
                  })
                }
                options={[
                  { value: "percentage", label: "Percent off" },
                  { value: "fixed_amount", label: "Pesos off" },
                  { value: "free_trial_days", label: "Extra trial days" },
                ]}
              />
            </CatalogField>
            <CatalogField label="How much" hint={discountHint}>
              <CatalogNumberInput
                value={values.discountValue}
                min={0}
                onChange={(discountValue) => onChange({ discountValue })}
              />
            </CatalogField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <CatalogField
              label="How many times it can be used"
              hint="Leave blank for no cap."
            >
              <CatalogNumberInput
                value={values.maxRedemptions}
                min={0}
                onChange={(maxRedemptions) => onChange({ maxRedemptions })}
              />
            </CatalogField>
            <CatalogField
              label="Minimum checkout (₱)"
              hint="Leave blank if there is no minimum."
            >
              <CatalogNumberInput
                value={values.minSubtotal}
                min={0}
                onChange={(minSubtotal) => onChange({ minSubtotal })}
              />
            </CatalogField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <CatalogField label="Starts">
              <input
                type="datetime-local"
                value={values.validFrom}
                onChange={(event) => onChange({ validFrom: event.target.value })}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none ring-[var(--primary)] focus:ring-2"
              />
            </CatalogField>
            <CatalogField label="Ends">
              <input
                type="datetime-local"
                value={values.validUntil}
                onChange={(event) => onChange({ validUntil: event.target.value })}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none ring-[var(--primary)] focus:ring-2"
              />
            </CatalogField>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Works on these plans</p>
            <PlanCodeChecklist
              value={values.applicablePlanCodes}
              onChange={(applicablePlanCodes) => onChange({ applicablePlanCodes })}
              hint="Leave all unchecked to allow every plan."
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Works on these billing periods</p>
            <div className="flex flex-wrap gap-3">
              <CatalogCheckbox
                checked={commaListHas(values.applicableBillingCycles, "monthly")}
                onChange={(checked) =>
                  onChange({
                    applicableBillingCycles: toggleCommaValue(
                      values.applicableBillingCycles,
                      "monthly",
                      checked,
                    ),
                  })
                }
                label="Monthly"
              />
              <CatalogCheckbox
                checked={commaListHas(values.applicableBillingCycles, "yearly")}
                onChange={(checked) =>
                  onChange({
                    applicableBillingCycles: toggleCommaValue(
                      values.applicableBillingCycles,
                      "yearly",
                      checked,
                    ),
                  })
                }
                label="Yearly"
              />
            </div>
          </div>
          <CatalogCheckbox
            checked={values.stacksWithOtherPromos}
            onChange={(stacksWithOtherPromos) => onChange({ stacksWithOtherPromos })}
            label="Can be combined with other promos"
          />
          <CatalogCheckbox
            checked={values.firstTimeSubscriberOnly}
            onChange={(firstTimeSubscriberOnly) =>
              onChange({ firstTimeSubscriberOnly })
            }
            label="First subscription only"
          />
        </CatalogFormSection>
      : <CatalogFormSection title="Partner commission">
          <CatalogField label="Partner email">
            <CatalogTextInput
              value={values.contactEmail}
              onChange={(contactEmail) => onChange({ contactEmail })}
              placeholder="partner@example.com"
            />
          </CatalogField>
          <div className="grid gap-3 sm:grid-cols-2">
            <CatalogField label="How they earn">
              <CatalogSelect
                value={values.commissionType}
                onChange={(commissionType) =>
                  onChange({
                    commissionType:
                      commissionType as VoucherAffiliateFormValues["commissionType"],
                  })
                }
                options={[
                  { value: "percentage", label: "Percent of the sale" },
                  { value: "fixed_per_conversion", label: "Fixed pesos per signup" },
                ]}
              />
            </CatalogField>
            <CatalogField
              label="How much"
              hint={
                values.commissionType === "fixed_per_conversion" ?
                  "Pesos paid to the partner per successful signup."
                : "10 means 10% of the subscription."
              }
            >
              <CatalogNumberInput
                value={values.commissionValue}
                min={0}
                onChange={(commissionValue) => onChange({ commissionValue })}
              />
            </CatalogField>
          </div>
        </CatalogFormSection>
      }
    </>
  );
}

function ProductIconFormFields({
  values,
  onChange,
}: {
  values: ProductIconFormValues;
  onChange: (patch: Partial<ProductIconFormValues>) => void;
  documentIdDisabled?: boolean;
}) {
  return (
    <>
      <CatalogFormSection title="Icon stations pick">
        <p className="text-sm text-zinc-600">
          These icons appear when a station assigns artwork to a delivery product. They are not
          part of subscription plans.
        </p>
        <CatalogField label="Name">
          <CatalogTextInput
            value={values.name}
            onChange={(name) => onChange({ name })}
            placeholder="Water"
          />
        </CatalogField>
        <CatalogCheckbox
          checked={values.active}
          onChange={(active) => onChange({ active })}
          label="Show in the product picker"
        />
        <CatalogCheckbox
          checked={values.waterContainer}
          onChange={(waterContainer) => onChange({ waterContainer })}
          label="This is a water container (gallon, bottle, or other refill)"
        />
      </CatalogFormSection>
      <CatalogFormSection title="Artwork">
        <CatalogField label="Image URL" hint="Public SVG or PNG link. Optional if you set a Lucide name.">
          <CatalogTextInput
            value={values.imageUrl}
            onChange={(imageUrl) => onChange({ imageUrl })}
            placeholder="https://…"
          />
        </CatalogField>
        <CatalogField label="Lucide icon name" hint="Optional fallback, for example Droplets.">
          <CatalogTextInput
            value={values.lucide}
            onChange={(lucide) => onChange({ lucide })}
            placeholder="Droplets"
          />
        </CatalogField>
        <CatalogField label="List order" hint="Lower numbers appear first.">
          <CatalogNumberInput
            value={values.sortOrder}
            min={0}
            onChange={(sortOrder) => onChange({ sortOrder })}
          />
        </CatalogField>
      </CatalogFormSection>
    </>
  );
}

function TrialPolicyFormFields({
  values,
  onChange,
}: {
  values: TrialPolicyFormValues;
  onChange: (patch: Partial<TrialPolicyFormValues>) => void;
  documentIdDisabled?: boolean;
}) {
  const planOptions = PLAN_PRESET_OPTIONS.filter((option) => option.code !== "enterprise").map(
    (option) => ({ value: option.code, label: option.label }),
  );

  return (
    <>
      <CatalogFormSection title="What new stations get">
        <p className="text-sm text-zinc-600">
          This is the signup trial, not a pricing card. New stations try one paid plan for a
          limited time. If they do not subscribe, they move to Free.
        </p>
        <CatalogCheckbox
          checked={values.enabled && values.isActive}
          onChange={(enabled) => onChange({ enabled, isActive: enabled })}
          label="Offer a free trial to new stations"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField
            label="How many days"
            hint="Typical is 15 days."
          >
            <CatalogNumberInput
              value={values.durationDays}
              min={1}
              onChange={(durationDays) => onChange({ durationDays })}
            />
          </CatalogField>
          <CatalogField
            label="Team Hub chat preview (days)"
            hint="How long trial stations can try Team Hub chat. 0 turns it off."
          >
            <CatalogNumberInput
              value={values.teamChatPreviewDays}
              min={0}
              onChange={(teamChatPreviewDays) => onChange({ teamChatPreviewDays })}
            />
          </CatalogField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField
            label="Plan they try"
            hint="Usually Scale. The trial copies that plan's features, with the River AI limits below."
          >
            <CatalogSelect
              value={values.basedOnPlanCode || "scale"}
              onChange={(basedOnPlanCode) => onChange({ basedOnPlanCode })}
              options={planOptions}
            />
          </CatalogField>
          <CatalogField
            label="If they do not subscribe"
            hint="Must be Free so unpaid stations still have a plan."
          >
            <CatalogSelect
              value={values.fallbackPlanCode || "free"}
              onChange={(fallbackPlanCode) => onChange({ fallbackPlanCode })}
              options={planOptions}
            />
          </CatalogField>
        </div>
        <CatalogCheckbox
          checked={values.pauseAllowed}
          onChange={(pauseAllowed) => onChange({ pauseAllowed })}
          label="Allow stations to pause leftover trial days"
        />
        <CatalogCheckbox
          checked={values.oneTrialPerBusiness}
          onChange={(oneTrialPerBusiness) => onChange({ oneTrialPerBusiness })}
          label="One trial per station"
        />
      </CatalogFormSection>
      <CatalogFormSection title="River AI during the trial">
        <p className="text-sm text-zinc-600">
          These caps apply only while the station is on trial. After they pay, they get the
          subscribed plan limits.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField label="River AI chats per day">
            <CatalogNumberInput
              value={values.riverAiChatMax}
              min={0}
              onChange={(riverAiChatMax) => onChange({ riverAiChatMax })}
            />
          </CatalogField>
          <CatalogField label="Attachments per day">
            <CatalogNumberInput
              value={values.riverAiAttachmentsMax}
              min={0}
              onChange={(riverAiAttachmentsMax) => onChange({ riverAiAttachmentsMax })}
            />
          </CatalogField>
        </div>
      </CatalogFormSection>
    </>
  );
}

export function CatalogDocumentFormFields({
  form,
  onChange,
  documentIdDisabled,
}: {
  form: CatalogFormValues;
  onChange: (next: CatalogFormValues) => void;
  documentIdDisabled?: boolean;
}) {
  if (form.collectionId === "subscription_plans") {
    return (
      <PlanFormFields
        values={form.values}
        documentIdDisabled={documentIdDisabled}
        onChange={(patch) =>
          onChange({ collectionId: form.collectionId, values: { ...form.values, ...patch } })
        }
      />
    );
  }

  if (form.collectionId === "subscription_addons") {
    return (
      <AddonFormFields
        values={form.values}
        documentIdDisabled={documentIdDisabled}
        onChange={(patch) =>
          onChange({ collectionId: form.collectionId, values: { ...form.values, ...patch } })
        }
      />
    );
  }

  if (form.collectionId === "product_icons") {
    return (
      <ProductIconFormFields
        values={form.values}
        documentIdDisabled={documentIdDisabled}
        onChange={(patch) =>
          onChange({ collectionId: form.collectionId, values: { ...form.values, ...patch } })
        }
      />
    );
  }

  if (form.collectionId === "subscription_trial_policy") {
    return (
      <TrialPolicyFormFields
        values={form.values}
        documentIdDisabled={documentIdDisabled}
        onChange={(patch) =>
          onChange({ collectionId: form.collectionId, values: { ...form.values, ...patch } })
        }
      />
    );
  }

  return (
    <VoucherAffiliateFormFields
      values={form.values}
      documentIdDisabled={documentIdDisabled}
      onChange={(patch) =>
        onChange({ collectionId: form.collectionId, values: { ...form.values, ...patch } })
      }
    />
  );
}
