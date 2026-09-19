"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CatalogDocumentFormFields } from "@/features/admin/components/catalog-document-form-fields";
import { useAdminCatalogCollection } from "@/hooks/use-admin-catalog-collection";
import { ADMIN_CATALOG_COLLECTIONS } from "@/lib/admin/catalog-collections";
import {
  catalogDocumentPayloadFromForm,
  catalogFormDocumentId,
  catalogFormValuesFromDocument,
  emptyCatalogFormValues,
  validateCatalogForm,
  type CatalogFormValues,
} from "@/lib/admin/catalog-document-forms";
import {
  missingRequiredPlanCodes,
  planPresetLabel,
} from "@/lib/admin/plan-catalog-display";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ?
      (value as Record<string, unknown>)
    : null;
}

function liveTrialSummary(data: Record<string, unknown> | undefined) {
  if (!data) {
    return {
      published: false,
      enabled: false,
      durationDays: "15",
      basedOnPlanCode: "scale",
      fallbackPlanCode: "free",
      teamChatPreviewDays: "3",
      pendingDraft: false,
    };
  }
  const draft = asRecord(data.draft);
  return {
    published: String(data.catalogStatus || "published") !== "draft" && data.isActive !== false,
    enabled: data.enabled !== false && data.isActive !== false,
    durationDays: data.durationDays !== undefined ? String(data.durationDays) : "15",
    basedOnPlanCode: String(data.basedOnPlanCode || "scale"),
    fallbackPlanCode: String(data.fallbackPlanCode || "free"),
    teamChatPreviewDays:
      data.teamChatPreviewDays !== undefined ? String(data.teamChatPreviewDays) : "3",
    pendingDraft: Boolean(draft),
  };
}

export function TrialPolicyManager({ enabled = true }: { enabled?: boolean }) {
  const meta = ADMIN_CATALOG_COLLECTIONS.subscription_trial_policy;
  const {
    documents,
    isLoading,
    error,
    saveDocument,
    publishDocument,
    listAudit,
  } = useAdminCatalogCollection("subscription_trial_policy", enabled);
  const plans = useAdminCatalogCollection("subscription_plans", enabled);

  const currentDoc = documents.find((doc) => doc.documentId === "current") ?? documents[0];
  const summary = liveTrialSummary(currentDoc?.data);
  const missingPlans = missingRequiredPlanCodes(plans.documents);
  const missingFree = missingPlans.includes("free");

  const [form, setForm] = useState<CatalogFormValues>(() =>
    emptyCatalogFormValues("subscription_trial_policy"),
  );
  const [hydratedFrom, setHydratedFrom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sourceKey =
    isLoading && !currentDoc ? null : currentDoc?.path ?? "empty";
  if (sourceKey && hydratedFrom !== sourceKey) {
    setHydratedFrom(sourceKey);
    setForm(
      currentDoc ?
        catalogFormValuesFromDocument(
          "subscription_trial_policy",
          currentDoc.documentId,
          currentDoc.data,
        )
      : emptyCatalogFormValues("subscription_trial_policy"),
    );
  }

  const basedOnLabel = useMemo(
    () => planPresetLabel(summary.basedOnPlanCode),
    [summary.basedOnPlanCode],
  );
  const fallbackLabel = useMemo(
    () => planPresetLabel(summary.fallbackPlanCode),
    [summary.fallbackPlanCode],
  );

  async function handleSave(publish: boolean) {
    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      const validationError = validateCatalogForm(form);
      if (validationError) throw new Error(validationError);
      const documentId = catalogFormDocumentId(form);
      const payload = catalogDocumentPayloadFromForm(form, currentDoc?.data);
      await saveDocument(documentId, payload);
      if (publish) {
        const effectiveAt =
          typeof payload.effectiveAt === "string" ? payload.effectiveAt : undefined;
        await publishDocument(documentId, effectiveAt);
        setNotice("Published. New signups will use this trial. Stations already on trial keep theirs.");
      } else {
        setNotice("Draft saved. Stations still see the last published trial until you publish.");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save the free trial.");
    } finally {
      setSaving(false);
    }
  }

  async function handleHistory() {
    if (!currentDoc) {
      window.alert("No published trial yet.");
      return;
    }
    const entries = await listAudit(currentDoc.documentId);
    const lines =
      entries.length === 0 ?
        "No changes yet."
      : entries
        .map((entry) =>
          [entry.createdAt || "unknown time", entry.action, entry.actorEmail || entry.actorUid].join(
            " · ",
          ),
        )
        .join("\n");
    window.alert(lines);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Subscriptions
          </p>
          <h1 className="text-2xl font-bold text-foreground">{meta.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
            {meta.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void handleHistory()} disabled={!currentDoc}>
            Who changed this
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-white p-5">
        <h2 className="text-sm font-semibold text-foreground">How this works</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-600">
          <li>A new station signs up and starts a free trial automatically.</li>
          <li>
            During the trial they use the paid plan you choose below (usually Scale), with River
            AI capped.
          </li>
          <li>If they subscribe, they keep paying for that plan.</li>
          <li>
            If they do not pay before the trial ends, they move to Free. That is why Free must
            exist in{" "}
            <Link
              href="/subscriptions/plans"
              className="font-medium text-[var(--primary)] underline-offset-2 hover:underline"
            >
              Plan management
            </Link>
            .
          </li>
          <li>
            Publish changes new signups only. Stations already on trial keep the trial they started
            with.
          </li>
        </ol>
      </section>

      {missingFree && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Free (₱0) is not in Plan management yet.</p>
          <p className="mt-1 text-amber-800">
            Add and publish Free before turning the trial on, or unpaid stations will have nowhere
            to land.
          </p>
          <Link
            href="/subscriptions/plans"
            className="mt-2 inline-flex text-sm font-medium text-amber-950 underline underline-offset-2"
          >
            Add the Free plan
          </Link>
        </div>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">What new signups get today</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {currentDoc ?
                summary.published ?
                  "Live for new stations."
                : "Saved as a draft — not live yet."
              : "Nothing published yet. Fill in the form and click Publish."}
            </p>
          </div>
          {summary.pendingDraft ?
            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
              Unpublished changes
            </span>
          : summary.published && summary.enabled ?
            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Offering trial
            </span>
          : <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              Trial off
            </span>}
        </div>
        {isLoading && !currentDoc ?
          <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading trial…
          </div>
        : <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Length" value={`${summary.durationDays} days`} />
            <SummaryItem label="They try" value={basedOnLabel} />
            <SummaryItem label="If they do not subscribe" value={fallbackLabel} />
            <SummaryItem
              label="Team Hub chat preview"
              value={`${summary.teamChatPreviewDays} days`}
            />
          </dl>}
      </section>

      {(error || formError || notice) && (
        <div className="space-y-2">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          {notice && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {notice}
            </div>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-white p-5">
        <h2 className="text-sm font-semibold text-foreground">Edit the trial</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Save a draft to review, or publish when sales is ready. You do not need a developer.
        </p>
        <div className="mt-4 space-y-4">
          {form.collectionId === "subscription_trial_policy" ?
            <CatalogDocumentFormFields form={form} onChange={setForm} />
          : null}
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => void handleSave(false)} disabled={saving}>
            {saving ?
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Saving…
              </>
            : "Save draft"}
          </Button>
          <Button onClick={() => void handleSave(true)} disabled={saving}>
            Publish
          </Button>
        </div>
      </section>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
