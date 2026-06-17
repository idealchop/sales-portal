"use client";

import { useMemo, useState } from "react";
import { FileText, Link2, PlusCircle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useClients } from "@/hooks/use-clients";
import { useProposals } from "@/hooks/use-proposals";
import { shareProposal } from "@/lib/sales/api";
import { formatPhp } from "@/lib/format";
import type { Proposal } from "@/lib/definitions";

const STATUS_STYLES: Record<string, string> = {
  accepted: "bg-emerald-50 text-emerald-700",
  sent: "bg-blue-50 text-blue-700",
  draft: "bg-zinc-100 text-zinc-700",
  finalized: "bg-purple-50 text-purple-700",
  rejected: "bg-red-50 text-red-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_STYLES[status] ?? STATUS_STYLES.draft}>
      {status}
    </Badge>
  );
}

export function ProposalsPage() {
  const { proposals, isLoading: proposalsLoading, error: proposalsError } =
    useProposals();
  const { clients, isLoading: clientsLoading, error: clientsError } =
    useClients();
  const [view, setView] = useState<"proposals" | "clients">("proposals");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );

  const filteredProposals = useMemo(() => {
    if (statusFilter === "all") return proposals;
    return proposals.filter((row) => row.status === statusFilter);
  }, [proposals, statusFilter]);

  async function handleShare(proposalId: string) {
    setSharingId(proposalId);
    setShareMessage(null);
    try {
      const share = await shareProposal(proposalId);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/proposal/view/${share.linkId}`;
      await navigator.clipboard.writeText(url);
      setShareMessage("Share link copied to clipboard.");
    } catch {
      setShareMessage("Unable to create share link.");
    } finally {
      setSharingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Proposals & Clients
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Track pipeline deals and client accounts for your territory.
          </p>
        </div>
        <Button href="/dashboard/proposals/new">
          <PlusCircle className="mr-2 h-4 w-4" />
          New proposal
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={view === "proposals" ? "primary" : "outline"}
          size="sm"
          onClick={() => setView("proposals")}
        >
          <FileText className="mr-2 h-4 w-4" />
          Proposals
        </Button>
        <Button
          variant={view === "clients" ? "primary" : "outline"}
          size="sm"
          onClick={() => setView("clients")}
        >
          <Users className="mr-2 h-4 w-4" />
          Clients
        </Button>
      </div>

      {shareMessage ?
        <p className="text-sm text-teal-700">{shareMessage}</p>
      : null}

      {view === "proposals" ?
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Proposals</CardTitle>
              <CardDescription>
                {filteredProposals.length} proposal
                {filteredProposals.length === 1 ? "" : "s"}
              </CardDescription>
            </div>
            <select
              className="h-9 rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="finalized">Finalized</option>
              <option value="rejected">Rejected</option>
            </select>
          </CardHeader>
          <CardContent className="space-y-3">
            {proposalsLoading ?
              <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
            : proposalsError ?
              <p className="text-sm text-red-600">{proposalsError}</p>
            : filteredProposals.length === 0 ?
              <p className="text-sm text-[var(--muted-foreground)]">
                No proposals yet. Create your first proposal to get started.
              </p>
            : filteredProposals.map((proposal: Proposal) => {
                const client = clientById.get(proposal.clientId);
                return (
                  <div
                    key={proposal.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-4"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {proposal.title || "Untitled proposal"}
                      </p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {client?.companyName || "Unknown client"} ·{" "}
                        {formatPhp(proposal.amount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={sharingId === proposal.id}
                        onClick={() => void handleShare(proposal.id)}
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        {sharingId === proposal.id ? "Sharing…" : "Share"}
                      </Button>
                      <StatusBadge status={proposal.status} />
                    </div>
                  </div>
                );
              })
            }
          </CardContent>
        </Card>
      : <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
            <CardDescription>
              {clients.length} client{clients.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {clientsLoading ?
              <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
            : clientsError ?
              <p className="text-sm text-red-600">{clientsError}</p>
            : clients.length === 0 ?
              <p className="text-sm text-[var(--muted-foreground)]">
                No clients yet.
              </p>
            : clients.map((client) => (
                <div
                  key={client.id}
                  className="rounded-lg border border-[var(--border)] p-4"
                >
                  <p className="font-medium text-foreground">
                    {client.companyName}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {client.contactName}
                    {client.contactEmail ? ` · ${client.contactEmail}` : ""}
                  </p>
                  {client.status ?
                    <Badge className="mt-2">{client.status}</Badge>
                  : null}
                </div>
              ))
            }
          </CardContent>
        </Card>
      }
    </div>
  );
}
