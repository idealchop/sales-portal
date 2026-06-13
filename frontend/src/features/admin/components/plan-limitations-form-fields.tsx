"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CatalogCheckbox,
  CatalogField,
  CatalogFormSection,
  CatalogNumberInput,
  CatalogSelect,
  CatalogTextArea,
} from "@/features/admin/components/catalog-form-primitives";
import {
  createCustomLimitationEntry,
  type CustomLimitationEntry,
  type FrequencyQuotaForm,
  type MaxQuotaForm,
  type PlanLimitationsFormValues,
  type SupportAttachmentsForm,
  type SupportChatForm,
} from "@/lib/admin/plan-limitations-form";

function QuotaModeSelect({
  value,
  onChange,
}: {
  value: MaxQuotaForm["mode"];
  onChange: (mode: MaxQuotaForm["mode"]) => void;
}) {
  return (
    <CatalogSelect
      value={value}
      onChange={(next) => onChange(next as MaxQuotaForm["mode"])}
      options={[
        { value: "full", label: "Unlimited (full)" },
        { value: "capped", label: "Capped quota" },
      ]}
    />
  );
}

function FrequencyQuotaFields({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: FrequencyQuotaForm;
  onChange: (next: FrequencyQuotaForm) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
      </div>
      <CatalogField label="Limit type">
        <QuotaModeSelect
          value={value.mode}
          onChange={(mode) => onChange({ ...value, mode })}
        />
      </CatalogField>
      {value.mode === "capped" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField label="Max count">
            <CatalogNumberInput
              value={value.max}
              min={0}
              onChange={(max) => onChange({ ...value, max })}
            />
          </CatalogField>
          <CatalogField label="Frequency">
            <CatalogSelect
              value={value.frequency}
              onChange={(frequency) =>
                onChange({
                  ...value,
                  frequency: frequency as FrequencyQuotaForm["frequency"],
                })
              }
              options={[
                { value: "daily", label: "Daily" },
                { value: "monthly", label: "Monthly" },
              ]}
            />
          </CatalogField>
        </div>
      )}
    </div>
  );
}

function MaxQuotaFields({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: MaxQuotaForm;
  onChange: (next: MaxQuotaForm) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
      </div>
      <CatalogField label="Limit type">
        <QuotaModeSelect
          value={value.mode}
          onChange={(mode) => onChange({ ...value, mode })}
        />
      </CatalogField>
      {value.mode === "capped" && (
        <CatalogField label="Max count">
          <CatalogNumberInput
            value={value.max}
            min={0}
            onChange={(max) => onChange({ ...value, max })}
          />
        </CatalogField>
      )}
    </div>
  );
}

function SupportChatFields({
  value,
  onChange,
}: {
  value: SupportChatForm;
  onChange: (next: SupportChatForm) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
      <p className="text-sm font-medium text-foreground">River AI chat quota</p>
      <CatalogField label="Chat limit">
        <CatalogSelect
          value={value.mode}
          onChange={(mode) =>
            onChange({ ...value, mode: mode as SupportChatForm["mode"] })
          }
          options={[
            { value: "full", label: "Unlimited (full)" },
            { value: "capped", label: "Capped messages" },
            { value: "community", label: "Community only (legacy)" },
            { value: "legacy_boolean", label: "Enabled (legacy boolean)" },
          ]}
        />
      </CatalogField>
      {value.mode === "capped" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField label="Max messages">
            <CatalogNumberInput
              value={value.max}
              min={0}
              onChange={(max) => onChange({ ...value, max })}
            />
          </CatalogField>
          <CatalogField label="Frequency">
            <CatalogSelect
              value={value.frequency}
              onChange={(frequency) =>
                onChange({
                  ...value,
                  frequency: frequency as SupportChatForm["frequency"],
                })
              }
              options={[
                { value: "daily", label: "Daily" },
                { value: "monthly", label: "Monthly" },
              ]}
            />
          </CatalogField>
        </div>
      )}
    </div>
  );
}

function SupportAttachmentsFields({
  value,
  onChange,
}: {
  value: SupportAttachmentsForm;
  onChange: (next: SupportAttachmentsForm) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
      <p className="text-sm font-medium text-foreground">Support attachments</p>
      <CatalogField label="Attachment access">
        <CatalogSelect
          value={value.mode}
          onChange={(mode) =>
            onChange({ ...value, mode: mode as SupportAttachmentsForm["mode"] })
          }
          options={[
            { value: "off", label: "Disabled" },
            { value: "on_unlimited", label: "Enabled (unlimited)" },
            { value: "on_capped", label: "Enabled with cap" },
            { value: "full", label: "Full (legacy marker)" },
          ]}
        />
      </CatalogField>
      {value.mode === "on_capped" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField label="Max attachments">
            <CatalogNumberInput
              value={value.max}
              min={0}
              onChange={(max) => onChange({ ...value, max })}
            />
          </CatalogField>
          <CatalogField label="Frequency">
            <CatalogSelect
              value={value.frequency}
              onChange={(frequency) =>
                onChange({
                  ...value,
                  frequency: frequency as SupportAttachmentsForm["frequency"],
                })
              }
              options={[
                { value: "daily", label: "Daily" },
                { value: "monthly", label: "Monthly" },
              ]}
            />
          </CatalogField>
        </div>
      )}
    </div>
  );
}

function CustomLimitationRows({
  entries,
  onChange,
}: {
  entries: CustomLimitationEntry[];
  onChange: (entries: CustomLimitationEntry[]) => void;
}) {
  return (
    <div className="space-y-3">
      {entries.length === 0 && (
        <p className="text-sm text-zinc-500">
          No custom limitations yet. Add keys here for future quotas before they
          get first-class fields in this form.
        </p>
      )}
      {entries.map((entry, index) => (
        <div
          key={entry.id}
          className="space-y-3 rounded-lg border border-dashed border-zinc-300 bg-white p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <CatalogField label="Limitation key" className="flex-1">
              <input
                value={entry.key}
                onChange={(event) => {
                  const next = [...entries];
                  next[index] = { ...entry, key: event.target.value };
                  onChange(next);
                }}
                placeholder="e.g. inventory_skus"
                className="h-10 w-full rounded-lg border border-[var(--border)] px-3 font-mono text-sm outline-none ring-[var(--primary)] focus:ring-2"
              />
            </CatalogField>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-6 h-9 w-9 shrink-0 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
              aria-label="Remove custom limitation"
              onClick={() => onChange(entries.filter((row) => row.id !== entry.id))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <CatalogField
            label="Value (JSON)"
            hint="Object, array, string, number, or boolean — stored as-is on the plan."
          >
            <CatalogTextArea
              value={entry.valueJson}
              rows={5}
              onChange={(valueJson) => {
                const next = [...entries];
                next[index] = { ...entry, valueJson };
                onChange(next);
              }}
            />
          </CatalogField>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...entries, createCustomLimitationEntry()])}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add custom limitation
      </Button>
    </div>
  );
}

export function PlanLimitationsFormFields({
  values,
  onChange,
}: {
  values: PlanLimitationsFormValues;
  onChange: (next: PlanLimitationsFormValues) => void;
}) {
  return (
    <>
      <CatalogFormSection title="Core quotas">
        <MaxQuotaFields
          label="Customers"
          hint="Active customer records the business can manage."
          value={values.customers}
          onChange={(customers) => onChange({ ...values, customers })}
        />
        <FrequencyQuotaFields
          label="Transactions"
          hint="POS / refill transaction volume cap."
          value={values.transactions}
          onChange={(transactions) => onChange({ ...values, transactions })}
        />
        <FrequencyQuotaFields
          label="AI tools"
          hint="In-app AI tools (Analytic Hub, etc.) — not River AI support chat."
          value={values.aiTools}
          onChange={(aiTools) => onChange({ ...values, aiTools })}
        />
        <FrequencyQuotaFields
          label="Online orders"
          hint="Portal PLACE_ORDER and REQUEST_COLLECTION caps. Saved to online_orders and onlineOrders."
          value={values.onlineOrders}
          onChange={(onlineOrders) => onChange({ ...values, onlineOrders })}
        />
      </CatalogFormSection>

      <CatalogFormSection title="Staff seats">
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogField label="Admin seats">
            <CatalogNumberInput
              value={values.staffAdmin}
              min={0}
              onChange={(staffAdmin) => onChange({ ...values, staffAdmin })}
            />
          </CatalogField>
          <CatalogField label="Rider seats">
            <CatalogNumberInput
              value={values.staffRider}
              min={0}
              onChange={(staffRider) => onChange({ ...values, staffRider })}
            />
          </CatalogField>
        </div>
      </CatalogFormSection>

      <CatalogFormSection title="River AI support (limitations.support)">
        <SupportChatFields
          value={values.supportChat}
          onChange={(supportChat) => onChange({ ...values, supportChat })}
        />
        <SupportAttachmentsFields
          value={values.supportAttachments}
          onChange={(supportAttachments) => onChange({ ...values, supportAttachments })}
        />
        <CatalogCheckbox
          checked={values.supportAgentChat}
          onChange={(supportAgentChat) => onChange({ ...values, supportAgentChat })}
          label="Human agent / Brevo live chat enabled (agentChat)"
        />
      </CatalogFormSection>

      <CatalogFormSection title="Trial billing override (support.trial)">
        <CatalogCheckbox
          checked={values.supportTrial.enabled}
          onChange={(enabled) =>
            onChange({
              ...values,
              supportTrial: { ...values.supportTrial, enabled },
            })
          }
          label="Enable trial-period support override (e.g. Scale trial)"
        />
        {values.supportTrial.enabled && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <CatalogField label="Trial chat max">
                <CatalogNumberInput
                  value={values.supportTrial.chatMax}
                  min={0}
                  onChange={(chatMax) =>
                    onChange({
                      ...values,
                      supportTrial: { ...values.supportTrial, chatMax },
                    })
                  }
                />
              </CatalogField>
              <CatalogField label="Trial chat frequency">
                <CatalogSelect
                  value={values.supportTrial.chatFrequency}
                  onChange={(chatFrequency) =>
                    onChange({
                      ...values,
                      supportTrial: {
                        ...values.supportTrial,
                        chatFrequency:
                          chatFrequency as typeof values.supportTrial.chatFrequency,
                      },
                    })
                  }
                  options={[
                    { value: "daily", label: "Daily" },
                    { value: "monthly", label: "Monthly" },
                  ]}
                />
              </CatalogField>
            </div>
            <CatalogField label="Trial attachments">
              <CatalogSelect
                value={values.supportTrial.attachmentsMode}
                onChange={(attachmentsMode) =>
                  onChange({
                    ...values,
                    supportTrial: {
                      ...values.supportTrial,
                      attachmentsMode:
                        attachmentsMode as typeof values.supportTrial.attachmentsMode,
                    },
                  })
                }
                options={[
                  { value: "off", label: "Disabled" },
                  { value: "on_unlimited", label: "Enabled (unlimited)" },
                  { value: "on_capped", label: "Enabled with cap" },
                ]}
              />
            </CatalogField>
            {values.supportTrial.attachmentsMode === "on_capped" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <CatalogField label="Trial attachment max">
                  <CatalogNumberInput
                    value={values.supportTrial.attachmentsMax}
                    min={0}
                    onChange={(attachmentsMax) =>
                      onChange({
                        ...values,
                        supportTrial: { ...values.supportTrial, attachmentsMax },
                      })
                    }
                  />
                </CatalogField>
                <CatalogField label="Trial attachment frequency">
                  <CatalogSelect
                    value={values.supportTrial.attachmentsFrequency}
                    onChange={(attachmentsFrequency) =>
                      onChange({
                        ...values,
                        supportTrial: {
                          ...values.supportTrial,
                          attachmentsFrequency:
                            attachmentsFrequency as typeof values.supportTrial.attachmentsFrequency,
                        },
                      })
                    }
                    options={[
                      { value: "daily", label: "Daily" },
                      { value: "monthly", label: "Monthly" },
                    ]}
                  />
                </CatalogField>
              </div>
            )}
            <CatalogCheckbox
              checked={values.supportTrial.agentChat}
              onChange={(agentChat) =>
                onChange({
                  ...values,
                  supportTrial: { ...values.supportTrial, agentChat },
                })
              }
              label="Trial human agent chat enabled"
            />
          </div>
        )}
      </CatalogFormSection>

      <CatalogFormSection title="Custom & future limitations">
        <p className="text-xs text-zinc-500">
          Built-in keys: customers, transactions, aiTools, online_orders,
          staff, support. Legacy keys (supportAi, supportAiTrial) appear here if
          still on the document — remove them after migrating to support.*.
        </p>
        <CustomLimitationRows
          entries={values.customEntries}
          onChange={(customEntries) => onChange({ ...values, customEntries })}
        />
      </CatalogFormSection>
    </>
  );
}
