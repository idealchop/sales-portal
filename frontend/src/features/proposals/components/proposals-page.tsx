"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  FileText,
  Link2,
  PlusCircle,
  TrendingUp,
  Users,
} from "lucide-react";
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

const FUNNEL_ORDER = ["draft", "sent", "accepted", "finalized", "rejected"] as const;

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_STYLES[status] ?? STATUS_STYLES.draft}>
      {status}
    </Badge>
  );
}

function daysSince(value?: string): number | null {
  if (!value) return null;
  const created = new Date(value);
  if (Number.isNaN(created.getTime())) return null;
  return Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
}

function formatAging(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
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

  const funnel = useMemo(() => {
    const byStatus = new Map<string, { count: number; value: number }>();
    let pipelineValue = 0;
    let acceptedValue = 0;
    let sentOrBeyond = 0;
    let accepted = 0;

    for (const proposal of proposals) {
      const status = proposal.status || "draft";
      const amount = Number(proposal.amount || 0);
      const bucket = byStatus.get(status) ?? { count: 0, value: 0 };
      bucket.count += 1;
      bucket.value += amount;
      byStatus.set(status, bucket);

      if (status !== "draft" && status !== "rejected") {
        pipelineValue += amount;
      }
      if (status === "sent" || status === "accepted" || status === "finalized") {
        sentOrBeyond += 1;
      }
      if (status === "accepted" || status === "finalized") {
        accepted += 1;
        acceptedValue += amount;
      }
    }

    const winRate =
      sentOrBeyond > 0 ? Math.round((accepted / sentOrBeyond) * 100) : 0;

    return {
      pipelineValue,
      acceptedValue,
      winRate,
      stages: FUNNEL_ORDER.map((status) => ({
        status,
        count: byStatus.get(status)?.count ?? 0,
        value: byStatus.get(status)?.value ?? 0,
      })),
    };
  }, [proposals]);

  const filteredProposals = useMemo(() => {
    const base =
      statusFilter === "all" ?
        proposals
      : proposals.filter((row) => row.status === statusFilter);
    return [...base].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt)),
    );
  }, [proposals, statusFilter]);

  const staleSent = proposals.filter((row) => {
    if (row.status !== "sent") return false;
    const days = daysSince(row.createdAt);
    return days !== null && days >= 7;
  }).length;

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
            Pipeline funnel, deal aging, and quick actions for your territory.
          </p>
        </div>
        <Button href="/dashboard/proposals/new">
          <PlusCircle className="mr-2 h-4 w-4" />
          New proposal
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pipeline value</CardDescription>
            <CardTitle>{formatPhp(funnel.pipelineValue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Win rate</CardDescription>
            <CardTitle>{funnel.winRate}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Accepted value</CardDescription>
            <CardTitle>{formatPhp(funnel.acceptedValue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={staleSent > 0 ? "border-amber-200 bg-amber-50/40" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Sent &gt; 7 days</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {staleSent}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Pipeline funnel
          </CardTitle>
          <CardDescription>Count and value by stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-5">
            {funnel.stages.map((stage) => (
              <button
                key={stage.status}
                type="button"
                onClick={() => setStatusFilter(stage.status)}
                className={`rounded-lg border p-3 text-left transition hover:border-teal-200 hover:bg-teal-50/40 ${
                  statusFilter === stage.status ?
                    "border-teal-300 bg-teal-50/60 ring-1 ring-teal-200"
                  : "border-[var(--border)]"
                }`}
              >
                <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">
                  {stage.status}
                </p>
                <p className="mt-1 text-lg font-bold">{stage.count}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {formatPhp(stage.value)}
                </p>
              </button>
            ))}
          </div>
          {statusFilter !== "all" ?
            <button
              type="button"
              className="mt-3 text-sm text-teal-700 hover:underline"
              onClick={() => setStatusFilter("all")}
            >
              Clear stage filter
            </button>
          : null}
        </CardContent>
      </Card>

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
          Clients ({clients.length})
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
                {filteredProposals.length} in view
              </CardDescription>
            </div>
            <select
              className="h-9 rounded-lg border border-[var(--border)] bg-white px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {FUNNEL_ORDER.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </CardHeader>
          <CardContent className="space-y-3">
            {proposalsLoading ?
              <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
            : proposalsError ?
              <p className="text-sm text-red-600">{proposalsError}</p>
            : filteredProposals.length === 0 ?
              <p className="text-sm text-[var(--muted-foreground)]">
                No proposals match this filter.{" "}
                <Link href="/dashboard/proposals/new" className="text-teal-700 underline">
                  Create one
                </Link>
              </p>
            : filteredProposals.map((proposal: Proposal) => {
                const client = clientById.get(proposal.clientId);
                const aging = formatAging(daysSince(proposal.createdAt));
                const isStale =
                  proposal.status === "sent" &&
                  (daysSince(proposal.createdAt) ?? 0) >= 7;

                return (
                  <div
                    key={proposal.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 ${
                      isStale ? "border-amber-200 bg-amber-50/30" : "border-[var(--border)]"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {proposal.title || "Untitled proposal"}
                      </p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {client?.companyName || "Unknown client"} ·{" "}
                        {formatPhp(proposal.amount)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        Created {aging}
                        {isStale ? " · Follow up recommended" : ""}
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
                No clients yet — add clients when creating a proposal.
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
