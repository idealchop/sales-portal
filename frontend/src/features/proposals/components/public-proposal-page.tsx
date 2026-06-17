"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Building2, FileText, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchPublicProposal } from "@/lib/sales/api";
import { formatPhp } from "@/lib/format";
import type { Client, Proposal } from "@/lib/definitions";

export function PublicProposalPage({ linkId }: { linkId: string }) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchPublicProposal(linkId);
        if (!cancelled) {
          setProposal(data.proposal);
          setClient(data.client);
        }
      } catch {
        if (!cancelled) {
          setError("This sharing link is invalid or has expired.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [linkId]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600/20 border-t-teal-600" />
      </div>
    );
  }

  if (error || !proposal || !client) {
    return (
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="mt-4">Link invalid or expired</CardTitle>
          <CardDescription>{error || "Proposal not found."}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {proposal.title || "Sales proposal"}
          </CardTitle>
          <CardDescription>
            Prepared for {client.companyName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{proposal.status}</Badge>
            <span className="text-sm font-medium text-foreground">
              {formatPhp(proposal.amount)} / month
            </span>
          </div>

          <div className="grid gap-3 rounded-lg bg-zinc-50 p-4 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 text-zinc-500" />
              <div>
                <p className="font-medium text-foreground">{client.companyName}</p>
                <p className="text-[var(--muted-foreground)]">{client.contactName}</p>
              </div>
            </div>
            {client.contactEmail ?
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-zinc-500" />
                <span>{client.contactEmail}</span>
              </div>
            : null}
            {client.contactPhone ?
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-zinc-500" />
                <span>{client.contactPhone}</span>
              </div>
            : null}
            {client.address ?
              <div className="flex items-start gap-2 sm:col-span-2">
                <FileText className="mt-0.5 h-4 w-4 text-zinc-500" />
                <span>{client.address}</span>
              </div>
            : null}
          </div>

          {proposal.content ?
            <div className="rounded-lg border border-[var(--border)] p-4 text-sm text-foreground whitespace-pre-wrap">
              {proposal.content}
            </div>
          : null}
        </CardContent>
      </Card>
    </div>
  );
}
