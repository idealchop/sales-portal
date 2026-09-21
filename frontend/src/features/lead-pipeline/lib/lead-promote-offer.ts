import { formatVoucherOfferLine } from "@/lib/admin/catalog-offer-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

export type PromoteOfferKind = "voucher" | "affiliate";

export type PromoteOffer = {
  documentId: string;
  kind: PromoteOfferKind;
  code: string;
  name: string;
  isActive: boolean;
  offerLine: string;
  contactEmail?: string;
  validUntil?: string | null;
  applicablePlans?: string;
  notesInternal?: string;
};

export type PromoteEmailDraft = {
  title: string;
  subject: string;
  bodyText: string;
  visibility: "personal";
  offerKind: PromoteOfferKind;
  offerCode: string;
};

function readTrimmed(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.trim();
}

function formatValidUntil(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.trim();
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPlans(data: Record<string, unknown>): string | undefined {
  const raw = data.applicablePlanCodes;
  const codes = Array.isArray(raw) ?
    raw.map((item) => String(item).trim()).filter(Boolean)
  : String(raw || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  if (codes.length === 0) return undefined;
  return codes.join(", ");
}

export function parsePromoteOffers(
  documents: UserFirestoreDocumentRow[],
): PromoteOffer[] {
  const rows: PromoteOffer[] = [];
  for (const doc of documents) {
    const kind: PromoteOfferKind =
      String(doc.data.kind || "voucher") === "affiliate" ? "affiliate" : "voucher";
    const code = readTrimmed(doc.data.code) || "";
    if (!code) continue;
    const name = readTrimmed(doc.data.name) || code;
    rows.push({
      documentId: doc.documentId,
      kind,
      code,
      name,
      isActive: doc.data.isActive !== false,
      offerLine: formatVoucherOfferLine(doc.data),
      contactEmail: readTrimmed(doc.data.contactEmail)?.toLowerCase(),
      validUntil: formatValidUntil(doc.data.validUntil),
      applicablePlans: formatPlans(doc.data),
      notesInternal: readTrimmed(doc.data.notesInternal),
    });
  }
  return rows.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function filterPromoteOffers(
  offers: PromoteOffer[],
  kind: PromoteOfferKind,
  opts: { activeOnly?: boolean; query?: string } = {},
): PromoteOffer[] {
  const q = opts.query?.trim().toLowerCase() || "";
  return offers.filter((offer) => {
    if (offer.kind !== kind) return false;
    if (opts.activeOnly !== false && !offer.isActive) return false;
    if (!q) return true;
    return (
      offer.code.toLowerCase().includes(q) ||
      offer.name.toLowerCase().includes(q) ||
      offer.offerLine.toLowerCase().includes(q)
    );
  });
}

/** Prefill blast compose when promoting a checkout voucher to prospects. */
export function buildVoucherPromoteDraft(offer: PromoteOffer): PromoteEmailDraft {
  const validity =
    offer.validUntil ? ` Valid until ${offer.validUntil}.` : "";
  const plans =
    offer.applicablePlans ? ` Applies to: ${offer.applicablePlans}.` : "";
  return {
    title: `Promo · ${offer.code}`,
    subject: `Exclusive Smart Refill offer for {{businessName}} — code ${offer.code}`,
    bodyText: [
      "Hi {{firstName}},",
      "",
      `May exclusive offer po kami for {{businessName}}: ${offer.name} (${offer.offerLine}).`,
      "",
      `Use code: ${offer.code} at checkout.${validity}${plans}`,
      "",
      "Kung gusto niyo pong i-apply, reply lang po dito or gamitin ang code when you subscribe.",
      "",
      "Maraming salamat po!",
    ].join("\n"),
    visibility: "personal",
    offerKind: "voucher",
    offerCode: offer.code,
  };
}

/**
 * Prefill when sharing a partner/affiliate code — usually to a referrer,
 * not as a checkout discount for prospects.
 */
export function buildAffiliatePromoteDraft(
  offer: PromoteOffer,
): PromoteEmailDraft {
  return {
    title: `Partner · ${offer.code}`,
    subject: `Your Smart Refill partner code — ${offer.code}`,
    bodyText: [
      "Hi {{firstName}},",
      "",
      `Ito po ang partner code ninyo sa Smart Refill: ${offer.code}`,
      `(${offer.name} — ${offer.offerLine})`,
      "",
      "Pwede niyo pong i-share ang code na ito sa mga water stations na irerefer ninyo.",
      "Kapag nag-subscribe sila using your code, tracked po ang referral.",
      "",
      "Kung kailangan niyo ng materials or help, reply lang po.",
      "",
      "Maraming salamat po!",
    ].join("\n"),
    visibility: "personal",
    offerKind: "affiliate",
    offerCode: offer.code,
  };
}

export function buildPromoteEmailDraft(offer: PromoteOffer): PromoteEmailDraft {
  return offer.kind === "affiliate" ?
      buildAffiliatePromoteDraft(offer)
    : buildVoucherPromoteDraft(offer);
}
