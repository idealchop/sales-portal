"use client";

import { useMemo, useState } from "react";
import { Building2, Check, Handshake, Search, UserRound, X } from "lucide-react";
import { useClients } from "@/hooks/use-clients";
import { useAdminCatalogCollection } from "@/hooks/use-admin-catalog-collection";
import { catalogAffiliates } from "@/lib/admin/catalog-offer-options";
import { inputClassName, labelClassName } from "@/features/lead-pipeline/lib/lead-pipeline-display";
import { cn } from "@/lib/utils";

export type LeadReferrerSelection = {
  label: string;
  clientId?: string;
  userId?: string;
  affiliateId?: string;
  affiliateCode?: string;
};

type ReferrerOption = LeadReferrerSelection & {
  key: string;
  subtitle: string;
  kind: "client" | "account" | "affiliate";
};

function buildOptions(
  clients: ReturnType<typeof useClients>["clients"],
  directory: ReturnType<typeof useClients>["directory"],
  affiliates: ReturnType<typeof catalogAffiliates>,
): ReferrerOption[] {
  const options: ReferrerOption[] = [];
  const seenClientIds = new Set<string>();
  const seenUserIds = new Set<string>();
  const seenAffiliateIds = new Set<string>();

  for (const affiliate of affiliates) {
    if (!affiliate.isActive) continue;
    seenAffiliateIds.add(affiliate.documentId);
    if (affiliate.ownerUserId) seenUserIds.add(affiliate.ownerUserId);
    options.push({
      key: `affiliate:${affiliate.documentId}`,
      kind: "affiliate",
      label: affiliate.name,
      subtitle: affiliate.code ?
        `Affiliate · ${affiliate.code}`
      : "Affiliate partner",
      affiliateId: affiliate.documentId,
      affiliateCode: affiliate.code || undefined,
      userId: affiliate.ownerUserId,
    });
  }

  for (const client of clients) {
    seenClientIds.add(client.id);
    if (client.linkedUserId) seenUserIds.add(client.linkedUserId);
    const matchedAffiliate = affiliates.find(
      (row) =>
        row.isActive &&
        ((client.linkedUserId && row.ownerUserId === client.linkedUserId) ||
          (client.contactEmail &&
            row.contactEmail === client.contactEmail.trim().toLowerCase())),
    );
    if (matchedAffiliate && seenAffiliateIds.has(matchedAffiliate.documentId)) {
      continue;
    }
    options.push({
      key: `client:${client.id}`,
      kind: "client",
      label:
        [client.companyName, client.contactName].filter(Boolean).join(" · ") ||
        client.companyName ||
        client.contactName ||
        client.id,
      subtitle:
        matchedAffiliate ?
          `CRM · already affiliate ${matchedAffiliate.code || matchedAffiliate.name}`
        : client.contactEmail || client.contactPhone || "CRM client",
      clientId: client.id,
      userId: client.linkedUserId,
      affiliateId: matchedAffiliate?.documentId,
      affiliateCode: matchedAffiliate?.code,
    });
  }

  for (const entry of directory) {
    if (seenUserIds.has(entry.linkedUserId)) continue;
    if (entry.clientId && seenClientIds.has(entry.clientId)) continue;
    options.push({
      key: entry.clientId ?
        `client:${entry.clientId}`
      : `user:${entry.linkedUserId}`,
      kind: entry.clientId ? "client" : "account",
      label:
        [entry.companyName, entry.displayName].filter(Boolean).join(" · ") ||
        entry.displayName ||
        entry.email ||
        entry.linkedUserId,
      subtitle: entry.email || entry.phone || "Platform account",
      clientId: entry.clientId,
      userId: entry.linkedUserId,
    });
  }

  return options.sort((a, b) => {
    if (a.kind === "affiliate" && b.kind !== "affiliate") return -1;
    if (a.kind !== "affiliate" && b.kind === "affiliate") return 1;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
}

export function LeadReferrerPicker({
  value,
  onChange,
}: {
  value: LeadReferrerSelection;
  onChange: (value: LeadReferrerSelection) => void;
}) {
  const { clients, directory, isLoading: clientsLoading } = useClients();
  const { documents: offerDocs, isLoading: offersLoading } =
    useAdminCatalogCollection("vouchers_affiliates", true);
  const affiliates = useMemo(() => catalogAffiliates(offerDocs), [offerDocs]);
  const isLoading = clientsLoading || offersLoading;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const options = useMemo(
    () => buildOptions(clients, directory, affiliates),
    [affiliates, clients, directory],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 12);
    return options
      .filter((option) => {
        const haystack = [
          option.label,
          option.subtitle,
          option.clientId,
          option.userId,
          option.affiliateCode,
          option.affiliateId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 12);
  }, [options, query]);

  const selectedKey =
    value.affiliateId ? `affiliate:${value.affiliateId}`
    : value.clientId ? `client:${value.clientId}`
    : value.userId ? `user:${value.userId}`
    : null;

  function clearSelection() {
    onChange({
      label: "",
      clientId: undefined,
      userId: undefined,
      affiliateId: undefined,
      affiliateCode: undefined,
    });
    setQuery("");
  }

  return (
    <div className="relative block sm:col-span-2">
      <span className={labelClassName}>Who referred</span>
      {value.label ?
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-2">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-teal-700" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-zinc-900">
              {value.label}
            </div>
            <div className="text-[11px] text-zinc-500">
              {value.affiliateId ?
                value.affiliateCode ?
                  `Affiliate · ${value.affiliateCode}`
                : "Linked affiliate"
              : value.clientId ?
                "Linked CRM account"
              : value.userId ?
                "Linked platform account"
              : "Referral"}
            </div>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-md p-1 text-zinc-500 hover:bg-white hover:text-zinc-800"
            aria-label="Clear referrer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      : <div className="relative mt-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            className={cn(inputClassName, "pl-9")}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Allow click on options before closing.
              window.setTimeout(() => setOpen(false), 120);
            }}
            placeholder={
              isLoading ? "Loading accounts…" : "Search affiliate, account, or business…"
            }
            disabled={isLoading}
            autoComplete="off"
          />
          {open && !isLoading ?
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
              {filtered.length === 0 ?
                <p className="px-3 py-2 text-xs text-zinc-500">
                  No matching affiliates, accounts, or businesses.
                </p>
              : filtered.map((option) => {
                  const selected = selectedKey === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-zinc-50",
                        selected && "bg-teal-50",
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        onChange({
                          label: option.label,
                          clientId: option.clientId,
                          userId: option.userId,
                          affiliateId: option.affiliateId,
                          affiliateCode: option.affiliateCode,
                        });
                        setQuery("");
                        setOpen(false);
                      }}
                    >
                      {option.kind === "affiliate" ?
                        <Handshake className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" />
                      : option.kind === "client" ?
                        <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      : <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      }
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-zinc-900">
                          {option.label}
                        </span>
                        <span className="block truncate text-[11px] text-zinc-500">
                          {option.subtitle}
                        </span>
                      </span>
                      {selected ?
                        <Check className="mt-0.5 h-3.5 w-3.5 text-teal-700" />
                      : null}
                    </button>
                  );
                })
              }
            </div>
          : null}
        </div>
      }
    </div>
  );
}
