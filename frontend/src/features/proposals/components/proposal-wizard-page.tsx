"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Client } from "@/lib/definitions";
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
  const { clients, refresh: refreshClients } = useClients();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");

  const [selectedPlanId, setSelectedPlanId] = useState(PROPOSAL_PLANS[1].id);
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalNotes, setProposalNotes] = useState("");

  const selectedPlan = useMemo(
    () => PROPOSAL_PLANS.find((plan) => plan.id === selectedPlanId) ?? PROPOSAL_PLANS[0],
    [selectedPlanId],
  );

  const pendingClients = useMemo(
    () => clients.filter((client) => client.status !== "active"),
    [clients],
  );

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      let clientId = selectedClientId;
      if (clientMode === "new") {
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
              Choose an existing pending client or create a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
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
                New client
              </Button>
            </div>

            {clientMode === "existing" ?
              <select
                className={inputClassName}
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
              >
                <option value="">Select client</option>
                {pendingClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName} — {client.contactName}
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
