"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Client } from "@/lib/definitions";
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
import {
  PROPOSAL_PLANS,
  createClient,
  createProposal,
  shareProposal,
} from "@/lib/sales/api";
import { formatPhp } from "@/lib/format";

const inputClassName =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-foreground outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

export function ProposalWizardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedUserId = searchParams.get("user")?.trim() || "";
  const { clients, directory, refresh: refreshClients } = useClients();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const [clientMode, setClientMode] = useState<"user" | "existing" | "new">(
    "user",
  );
  const [selectedLinkedUserId, setSelectedLinkedUserId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [appFilter, setAppFilter] = useState("all");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");

  const [selectedPlanId, setSelectedPlanId] = useState<
    (typeof PROPOSAL_PLANS)[number]["id"]
  >(PROPOSAL_PLANS[1].id);
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalNotes, setProposalNotes] = useState("");

  const selectedPlan = useMemo(
    () => PROPOSAL_PLANS.find((plan) => plan.id === selectedPlanId) ?? PROPOSAL_PLANS[0],
    [selectedPlanId],
  );

  const appOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const entry of directory) {
      for (const app of entry.apps) {
        byId.set(app.appId, app.label);
      }
    }
    return [...byId.entries()]
      .map(([appId, label]) => ({ appId, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [directory]);

  const filteredDirectory = useMemo(() => {
    if (appFilter === "all") return directory;
    return directory.filter((entry) => entry.appIds.includes(appFilter));
  }, [directory, appFilter]);

  const pendingClients = useMemo(
    () => clients.filter((client) => client.status !== "active"),
    [clients],
  );

  const selectedUser = useMemo(
    () =>
      directory.find((entry) => entry.linkedUserId === selectedLinkedUserId) ??
      null,
    [directory, selectedLinkedUserId],
  );

  useEffect(() => {
    if (!preselectedUserId || directory.length === 0) return;
    const match = directory.find(
      (entry) => entry.linkedUserId === preselectedUserId,
    );
    if (!match) return;
    setClientMode("user");
    setSelectedLinkedUserId(match.linkedUserId);
  }, [preselectedUserId, directory]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      let clientId = selectedClientId;
      if (clientMode === "user") {
        if (!selectedLinkedUserId) {
          setError("Select a platform user before continuing.");
          return;
        }
        const created = await createClient({
          linkedUserId: selectedLinkedUserId,
          status: "pending",
          clientType: selectedPlan.id as Client["clientType"],
        });
        clientId = created.id;
        await refreshClients();
      } else if (clientMode === "new") {
        const created = await createClient({
          companyName,
          contactName,
          contactEmail,
          contactPhone,
          address,
          status: "pending",
          clientType: selectedPlan.id as Client["clientType"],
        });
        clientId = created.id;
        await refreshClients();
      }

      if (!clientId) {
        setError("Select or create a client before continuing.");
        return;
      }

      const proposal = await createProposal({
        clientId,
        title: proposalTitle || `${selectedPlan.name} proposal`,
        content: proposalNotes,
        amount: selectedPlan.amount,
        status: "draft",
        planId: selectedPlan.id,
        planName: selectedPlan.name,
      });

      const share = await shareProposal(proposal.id);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setShareUrl(`${origin}/proposal/view/${share.linkId}`);
      setStep(4);
    } catch {
      setError("Unable to create proposal. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create proposal</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Step {Math.min(step, 3)} of 3 — client, plan, review.
        </p>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Client</CardTitle>
            <CardDescription>
              Link a platform user (categorized by app), reuse a CRM client, or
              create a prospect.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={clientMode === "user" ? "primary" : "outline"}
                size="sm"
                onClick={() => setClientMode("user")}
              >
                Platform user
              </Button>
              <Button
                variant={clientMode === "existing" ? "primary" : "outline"}
                size="sm"
                onClick={() => setClientMode("existing")}
              >
                Existing client
              </Button>
              <Button
                variant={clientMode === "new" ? "primary" : "outline"}
                size="sm"
                onClick={() => setClientMode("new")}
              >
                New prospect
              </Button>
            </div>

            {clientMode === "user" ?
              <div className="space-y-3">
                <select
                  className={inputClassName}
                  value={appFilter}
                  onChange={(event) => setAppFilter(event.target.value)}
                >
                  <option value="all">All apps</option>
                  {appOptions.map((app) => (
                    <option key={app.appId} value={app.appId}>
                      {app.label}
                    </option>
                  ))}
                </select>
                <select
                  className={inputClassName}
                  value={selectedLinkedUserId}
                  onChange={(event) => setSelectedLinkedUserId(event.target.value)}
                >
                  <option value="">Select user</option>
                  {filteredDirectory.map((entry) => (
                    <option key={entry.linkedUserId} value={entry.linkedUserId}>
                      {entry.companyName || entry.displayName}
                      {entry.email ? ` — ${entry.email}` : ""}
                      {` (${entry.apps.map((app) => app.label).join(", ")})`}
                    </option>
                  ))}
                </select>
                {selectedUser ?
                  <div className="rounded-lg border border-[var(--border)] bg-zinc-50 p-3 text-sm">
                    <p className="font-medium text-foreground">
                      {selectedUser.displayName}
                    </p>
                    <p className="text-[var(--muted-foreground)]">
                      {selectedUser.email || "No email"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedUser.apps.map((app) => (
                        <Badge
                          key={app.appId}
                          className="bg-teal-50 text-teal-800 ring-1 ring-teal-100"
                        >
                          {app.label}
                          {app.role ? ` · ${app.role}` : ""}
                        </Badge>
                      ))}
                    </div>
                  </div>
                : null}
              </div>
            : clientMode === "existing" ?
              <select
                className={inputClassName}
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
              >
                <option value="">Select client</option>
                {pendingClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName} — {client.contactName}
                    {client.apps && client.apps.length > 0 ?
                      ` (${client.apps.map((app) => app.label).join(", ")})`
                    : ""}
                  </option>
                ))}
              </select>
            : <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className={inputClassName}
                  placeholder="Company name"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                />
                <input
                  className={inputClassName}
                  placeholder="Contact name"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                />
                <input
                  className={inputClassName}
                  placeholder="Email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                />
                <input
                  className={inputClassName}
                  placeholder="Phone"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                />
                <input
                  className={`${inputClassName} sm:col-span-2`}
                  placeholder="Address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </div>
            }

            <Button onClick={() => setStep(2)}>Continue to plan</Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
            <CardDescription>Select the subscription package.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {PROPOSAL_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`rounded-lg border p-4 text-left transition ${
                    selectedPlanId === plan.id ?
                      "border-teal-600 bg-teal-50"
                    : "border-[var(--border)] hover:bg-zinc-50"
                  }`}
                >
                  <p className="font-medium text-foreground">{plan.name}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {formatPhp(plan.amount)} / month
                  </p>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Continue to review</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review</CardTitle>
            <CardDescription>Confirm details before creating the proposal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              className={inputClassName}
              placeholder="Proposal title"
              value={proposalTitle}
              onChange={(event) => setProposalTitle(event.target.value)}
            />
            <textarea
              className={`${inputClassName} min-h-28 py-3`}
              placeholder="Notes for the client"
              value={proposalNotes}
              onChange={(event) => setProposalNotes(event.target.value)}
            />
            <div className="rounded-lg bg-zinc-50 p-4 text-sm">
              <p className="font-medium text-foreground">{selectedPlan.name}</p>
              <p className="text-[var(--muted-foreground)]">
                {formatPhp(selectedPlan.amount)} estimated monthly value
              </p>
              {selectedUser ?
                <p className="mt-2 text-[var(--muted-foreground)]">
                  Client user: {selectedUser.displayName}
                  {selectedUser.apps.length > 0 ?
                    ` · ${selectedUser.apps.map((app) => app.label).join(", ")}`
                  : ""}
                </p>
              : null}
            </div>
            {error ?
              <p className="text-sm text-red-600">{error}</p>
            : null}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button disabled={submitting} onClick={() => void handleSubmit()}>
                {submitting ? "Creating…" : "Create proposal"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && shareUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Proposal created</CardTitle>
            <CardDescription>
              Share this link with your prospect.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="break-all rounded-lg bg-zinc-50 p-3 text-sm">{shareUrl}</p>
            <div className="flex gap-2">
              <Button href="/dashboard/proposals">Back to proposals</Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/proposals")}
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
