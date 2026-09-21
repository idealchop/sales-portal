import { db, FieldValue } from "../config/firebase-admin";
import type { SalesActor } from "./sales-scope";
import { serializeDoc, toIsoString } from "./sales-serializer";

export type EmailTemplateVisibility = "personal" | "shared";

export type LeadEmailTemplateRecord = {
  id: string;
  title: string;
  subject: string;
  bodyText: string;
  visibility: EmailTemplateVisibility;
  createdByUid: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type UpsertLeadEmailTemplateInput = {
  title: string;
  subject: string;
  bodyText: string;
  visibility?: EmailTemplateVisibility;
};

function normalizeVisibility(raw: unknown): EmailTemplateVisibility {
  return raw === "shared" ? "shared" : "personal";
}

function normalizeTemplate(
  id: string,
  data: Record<string, unknown>,
): LeadEmailTemplateRecord {
  const base = serializeDoc<Record<string, unknown>>(id, data);
  return {
    id,
    title: String(base.title || "Untitled").trim() || "Untitled",
    subject: String(base.subject || ""),
    bodyText: String(base.bodyText || ""),
    visibility: normalizeVisibility(base.visibility),
    createdByUid: String(base.createdByUid || ""),
    createdAt: toIsoString(base.createdAt) ?? null,
    updatedAt: toIsoString(base.updatedAt) ?? null,
  };
}

function canMutateTemplate(
  actor: SalesActor,
  template: LeadEmailTemplateRecord,
): boolean {
  if (template.createdByUid === actor.uid) return true;
  if (template.visibility === "shared" && (actor.role === "admin" || actor.role === "manager")) {
    return true;
  }
  return false;
}

export async function listLeadEmailTemplates(
  actor: SalesActor,
): Promise<LeadEmailTemplateRecord[]> {
  const [personalSnap, sharedSnap] = await Promise.all([
    db
      .collection("sales_lead_email_templates")
      .where("visibility", "==", "personal")
      .where("createdByUid", "==", actor.uid)
      .get(),
    db
      .collection("sales_lead_email_templates")
      .where("visibility", "==", "shared")
      .get(),
  ]);

  const byId = new Map<string, LeadEmailTemplateRecord>();
  for (const doc of [...personalSnap.docs, ...sharedSnap.docs]) {
    byId.set(doc.id, normalizeTemplate(doc.id, doc.data() ?? {}));
  }

  return [...byId.values()].sort((a, b) => {
    if (a.visibility !== b.visibility) {
      return a.visibility === "personal" ? -1 : 1;
    }
    return a.title.localeCompare(b.title);
  });
}

export async function createLeadEmailTemplate(
  actor: SalesActor,
  input: UpsertLeadEmailTemplateInput,
): Promise<LeadEmailTemplateRecord> {
  if (!input.title?.trim() || !input.subject?.trim() || !input.bodyText?.trim()) {
    throw new Error("TEMPLATE_FIELDS_REQUIRED");
  }

  const visibility = normalizeVisibility(input.visibility);
  const ref = db.collection("sales_lead_email_templates").doc();
  await ref.set({
    title: input.title.trim(),
    subject: input.subject.trim(),
    bodyText: input.bodyText.trim(),
    visibility,
    createdByUid: actor.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const saved = await ref.get();
  return normalizeTemplate(saved.id, saved.data() ?? {});
}

export async function updateLeadEmailTemplate(
  actor: SalesActor,
  templateId: string,
  input: UpsertLeadEmailTemplateInput,
): Promise<LeadEmailTemplateRecord> {
  const ref = db.collection("sales_lead_email_templates").doc(templateId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("NOT_FOUND");
  const existing = normalizeTemplate(snap.id, snap.data() ?? {});
  if (!canMutateTemplate(actor, existing)) throw new Error("FORBIDDEN");

  if (!input.title?.trim() || !input.subject?.trim() || !input.bodyText?.trim()) {
    throw new Error("TEMPLATE_FIELDS_REQUIRED");
  }

  await ref.set(
    {
      title: input.title.trim(),
      subject: input.subject.trim(),
      bodyText: input.bodyText.trim(),
      visibility: normalizeVisibility(input.visibility ?? existing.visibility),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  const saved = await ref.get();
  return normalizeTemplate(saved.id, saved.data() ?? {});
}

export async function deleteLeadEmailTemplate(
  actor: SalesActor,
  templateId: string,
): Promise<void> {
  const ref = db.collection("sales_lead_email_templates").doc(templateId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("NOT_FOUND");
  const existing = normalizeTemplate(snap.id, snap.data() ?? {});
  if (!canMutateTemplate(actor, existing)) throw new Error("FORBIDDEN");
  await ref.delete();
}
