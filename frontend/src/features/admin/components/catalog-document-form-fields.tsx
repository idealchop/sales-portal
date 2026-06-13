"use client";

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
import type {
  AddonFormValues,
  CatalogFormValues,
  PlanFormValues,
  VoucherAffiliateFormValues,
} from "@/lib/admin/catalog-document-forms";

function PlanFormFields({
  values,
  onChange,
  documentIdDisabled,
}: {
  values: PlanFormValues;
  onChange: (patch: Partial<PlanFormValues>) => void;
  documentIdDisabled?: boolean;
}) {
  return (
    <>
      <CatalogFormSection title="Basics">
        <CatalogField label="Document ID" hint="Firestore document id, e.g. plan_starter">
          <CatalogTextInput
            value={values.documentId}
            disabled={documentIdDisabled}
            mono
            onChange={(documentId) => onChange({ documentId })}
          />
        </CatalogField>
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField label="Plan name">
            <CatalogTextInput
              value={values.name}
              onChange={(name) => onChange({ name })}
              placeholder="Starter"
            />
          </CatalogField>
          <CatalogField label="Plan code" hint="Lowercase key used in checkout">
            <CatalogTextInput
              value={values.code}
              onChange={(code) => onChange({ code })}
              placeholder="starter"
            />
          </CatalogField>
        </div>
        <CatalogCheckbox
          checked={values.isActive}
          onChange={(isActive) => onChange({ isActive })}
          label="Active (visible in billing flows)"
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
          <CatalogField label="Yearly price (₱)">
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

function AddonFormFields({
  values,
  onChange,
  documentIdDisabled,
}: {
  values: AddonFormValues;
  onChange: (patch: Partial<AddonFormValues>) => void;
  documentIdDisabled?: boolean;
}) {
  return (
    <>
      <CatalogFormSection title="Basics">
        <CatalogField label="Document ID" hint="e.g. addon_ext_rider">
          <CatalogTextInput
            value={values.documentId}
            disabled={documentIdDisabled}
            mono
            onChange={(documentId) => onChange({ documentId })}
          />
        </CatalogField>
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField label="Code">
            <CatalogTextInput
              value={values.code}
              onChange={(code) => onChange({ code: code.toUpperCase() })}
              placeholder="EXT_RIDER"
            />
          </CatalogField>
          <CatalogField label="Name">
            <CatalogTextInput
              value={values.name}
              onChange={(name) => onChange({ name })}
            />
          </CatalogField>
        </div>
        <CatalogField label="Description">
          <CatalogTextArea
            value={values.description}
            onChange={(description) => onChange({ description })}
          />
        </CatalogField>
        <CatalogCheckbox
          checked={values.isActive}
          onChange={(isActive) => onChange({ isActive })}
          label="Active"
        />
      </CatalogFormSection>

      <CatalogFormSection title="Billing">
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField label="Price (₱)">
            <CatalogNumberInput
              value={values.price}
              min={0}
              onChange={(price) => onChange({ price })}
            />
          </CatalogField>
          <CatalogField label="Units per purchase">
            <CatalogNumberInput
              value={values.unit}
              min={1}
              onChange={(unit) => onChange({ unit })}
            />
          </CatalogField>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <CatalogField label="Currency">
            <CatalogTextInput
              value={values.currency}
              onChange={(currency) => onChange({ currency: currency.toUpperCase() })}
            />
          </CatalogField>
          <CatalogField label="Billing model">
            <CatalogSelect
              value={values.billingModel}
              onChange={(billingModel) =>
                onChange({
                  billingModel: billingModel as AddonFormValues["billingModel"],
                })
              }
              options={[
                { value: "recurring", label: "Recurring" },
                { value: "one_time", label: "One-time" },
              ]}
            />
          </CatalogField>
          {values.billingModel === "recurring" && (
            <CatalogField label="Billing interval">
              <CatalogSelect
                value={values.billingInterval}
                onChange={(billingInterval) =>
                  onChange({
                    billingInterval:
                      billingInterval as AddonFormValues["billingInterval"],
                  })
                }
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "yearly", label: "Yearly" },
                ]}
              />
            </CatalogField>
          )}
        </div>
      </CatalogFormSection>

      <CatalogFormSection title="Catalog rules">
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField label="Sort order" hint="Lower numbers appear first">
            <CatalogNumberInput
              value={values.sortOrder}
              min={0}
              onChange={(sortOrder) => onChange({ sortOrder })}
            />
          </CatalogField>
          <CatalogField label="Max units per business">
            <CatalogNumberInput
              value={values.maxUnitsPerBusiness}
              min={0}
              onChange={(maxUnitsPerBusiness) => onChange({ maxUnitsPerBusiness })}
            />
          </CatalogField>
        </div>
        <CatalogField label="Feature key">
          <CatalogTextInput
            value={values.featureKey}
            onChange={(featureKey) => onChange({ featureKey })}
            placeholder="rider_slot"
          />
        </CatalogField>
        <CatalogField label="Extends plan limitation">
          <CatalogTextInput
            value={values.extendsPlanLimitation}
            onChange={(extendsPlanLimitation) => onChange({ extendsPlanLimitation })}
            placeholder="staff_rider"
          />
        </CatalogField>
        <CatalogField
          label="Applicable plan codes"
          hint="Comma-separated; leave empty for all paid tiers"
        >
          <CatalogTextInput
            value={values.applicablePlanCodes}
            onChange={(applicablePlanCodes) => onChange({ applicablePlanCodes })}
            placeholder="pro, scale"
          />
        </CatalogField>
        <CatalogCheckbox
          checked={values.trialEligible}
          onChange={(trialEligible) => onChange({ trialEligible })}
          label="Trial eligible"
        />
      </CatalogFormSection>
    </>
  );
}

function VoucherAffiliateFormFields({
  values,
  onChange,
  documentIdDisabled,
}: {
  values: VoucherAffiliateFormValues;
  onChange: (patch: Partial<VoucherAffiliateFormValues>) => void;
  documentIdDisabled?: boolean;
}) {
  return (
    <>
      <CatalogFormSection title="Basics">
        <CatalogField label="Document ID">
          <CatalogTextInput
            value={values.documentId}
            disabled={documentIdDisabled}
            mono
            onChange={(documentId) => onChange({ documentId })}
          />
        </CatalogField>
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField label="Kind">
            <CatalogSelect
              value={values.kind}
              onChange={(kind) =>
                onChange({ kind: kind as VoucherAffiliateFormValues["kind"] })
              }
              options={[
                { value: "voucher", label: "Voucher" },
                { value: "affiliate", label: "Affiliate" },
              ]}
            />
          </CatalogField>
          <CatalogField label="Code">
            <CatalogTextInput
              value={values.code}
              onChange={(code) => onChange({ code: code.toUpperCase() })}
              placeholder="LAUNCH20"
            />
          </CatalogField>
        </div>
        <CatalogField label="Name">
          <CatalogTextInput value={values.name} onChange={(name) => onChange({ name })} />
        </CatalogField>
        <CatalogField label="Internal notes">
          <CatalogTextArea
            value={values.notesInternal}
            onChange={(notesInternal) => onChange({ notesInternal })}
          />
        </CatalogField>
        <CatalogCheckbox
          checked={values.isActive}
          onChange={(isActive) => onChange({ isActive })}
          label="Active"
        />
      </CatalogFormSection>

      {values.kind === "voucher" ?
        <CatalogFormSection title="Voucher discount">
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
                  { value: "percentage", label: "Percentage (%)" },
                  { value: "fixed_amount", label: "Fixed amount (₱)" },
                  { value: "free_trial_days", label: "Free trial (days)" },
                ]}
              />
            </CatalogField>
            <CatalogField label="Discount value">
              <CatalogNumberInput
                value={values.discountValue}
                min={0}
                onChange={(discountValue) => onChange({ discountValue })}
              />
            </CatalogField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <CatalogField label="Max redemptions">
              <CatalogNumberInput
                value={values.maxRedemptions}
                min={0}
                onChange={(maxRedemptions) => onChange({ maxRedemptions })}
              />
            </CatalogField>
            <CatalogField label="Minimum subtotal (₱)">
              <CatalogNumberInput
                value={values.minSubtotal}
                min={0}
                onChange={(minSubtotal) => onChange({ minSubtotal })}
              />
            </CatalogField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <CatalogField label="Valid from">
              <input
                type="datetime-local"
                value={values.validFrom}
                onChange={(event) => onChange({ validFrom: event.target.value })}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none ring-[var(--primary)] focus:ring-2"
              />
            </CatalogField>
            <CatalogField label="Valid until">
              <input
                type="datetime-local"
                value={values.validUntil}
                onChange={(event) => onChange({ validUntil: event.target.value })}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none ring-[var(--primary)] focus:ring-2"
              />
            </CatalogField>
          </div>
          <CatalogField label="Applicable plan codes" hint="Comma-separated">
            <CatalogTextInput
              value={values.applicablePlanCodes}
              onChange={(applicablePlanCodes) => onChange({ applicablePlanCodes })}
            />
          </CatalogField>
          <CatalogField label="Applicable billing cycles" hint="Comma-separated">
            <CatalogTextInput
              value={values.applicableBillingCycles}
              onChange={(applicableBillingCycles) =>
                onChange({ applicableBillingCycles })
              }
            />
          </CatalogField>
          <CatalogField label="Currency">
            <CatalogTextInput
              value={values.currency}
              onChange={(currency) => onChange({ currency: currency.toUpperCase() })}
            />
          </CatalogField>
          <CatalogCheckbox
            checked={values.stacksWithOtherPromos}
            onChange={(stacksWithOtherPromos) => onChange({ stacksWithOtherPromos })}
            label="Stacks with other promos"
          />
          <CatalogCheckbox
            checked={values.firstTimeSubscriberOnly}
            onChange={(firstTimeSubscriberOnly) =>
              onChange({ firstTimeSubscriberOnly })
            }
            label="First-time subscriber only"
          />
        </CatalogFormSection>
      : <CatalogFormSection title="Affiliate commission">
          <CatalogField label="Contact email">
            <CatalogTextInput
              value={values.contactEmail}
              onChange={(contactEmail) => onChange({ contactEmail })}
              placeholder="partner@example.com"
            />
          </CatalogField>
          <div className="grid gap-3 sm:grid-cols-2">
            <CatalogField label="Commission type">
              <CatalogSelect
                value={values.commissionType}
                onChange={(commissionType) =>
                  onChange({
                    commissionType:
                      commissionType as VoucherAffiliateFormValues["commissionType"],
                  })
                }
                options={[
                  { value: "percentage", label: "Percentage (%)" },
                  { value: "fixed_per_conversion", label: "Fixed per conversion (₱)" },
                ]}
              />
            </CatalogField>
            <CatalogField label="Commission value">
              <CatalogNumberInput
                value={values.commissionValue}
                min={0}
                onChange={(commissionValue) => onChange({ commissionValue })}
              />
            </CatalogField>
          </div>
          <CatalogField label="Payout currency">
            <CatalogTextInput
              value={values.payoutCurrency}
              onChange={(payoutCurrency) =>
                onChange({ payoutCurrency: payoutCurrency.toUpperCase() })
              }
            />
          </CatalogField>
        </CatalogFormSection>
      }
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
