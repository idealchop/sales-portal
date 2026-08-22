"use client";

import { DatabaseBackup, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import { apiClient, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type ClonePhase =
  | "idle"
  | "exporting"
  | "deleting_dev"
  | "creating_dev"
  | "importing"
  | "completed"
  | "failed";

type CloneJob = {
  phase: ClonePhase;
  sourceDatabase: string;
  targetDatabase: string;
  startedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  startedByUid: string | null;
  exportUriPrefix: string | null;
  message: string;
  error: string | null;
};

type CloneStatusResponse = {
  data: {
    job: CloneJob;
    confirmPhrase: string;
  };
};

const ACTIVE: ClonePhase[] = [
  "exporting",
  "deleting_dev",
  "creating_dev",
  "importing",
];

function phaseLabel(phase: ClonePhase): string {
  switch (phase) {
    case "idle":
      return "Idle";
    case "exporting":
      return "Exporting Prod";
    case "deleting_dev":
      return "Removing riverdb-dev";
    case "creating_dev":
      return "Recreating riverdb-dev";
    case "importing":
      return "Importing into Dev";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return phase;
  }
}

export function AdminCloneProdToDevPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const [job, setJob] = useState<CloneJob | null>(null);
  const [confirmPhrase, setConfirmPhrase] = useState("CLONE PROD TO DEV");
  const [confirmInput, setConfirmInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const refresh = useCallback(async () => {
    const json = await apiClient.get<CloneStatusResponse>(
      "/admin/clone-prod-to-dev",
    );
    setJob(json.data.job);
    setConfirmPhrase(json.data.confirmPhrase);
    return json.data.job;
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (profile?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [profile?.role, profileLoading, router]);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    void refresh().catch((err) => {
      setError(
        err instanceof ApiError ? err.message : "Unable to load clone status.",
      );
    });
  }, [profile?.role, refresh]);

  useEffect(() => {
    if (!job || !ACTIVE.includes(job.phase)) return;
    const timer = window.setInterval(() => {
      void refresh().catch(() => {
        /* keep polling; surface on next successful load */
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [job, refresh]);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const json = await apiClient.post<CloneStatusResponse>(
        "/admin/clone-prod-to-dev",
        { confirm: confirmInput },
      );
      setJob(json.data.job);
      setConfirmPhrase(json.data.confirmPhrase);
      setConfirmInput("");
    } catch (err) {
      setError(
        err instanceof ApiError ?
          err.message
        : "Could not start Prod → Dev clone.",
      );
    } finally {
      setStarting(false);
    }
  }

  if (profileLoading || profile?.role !== "admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)]" />
      </div>
    );
  }

  const isActive = job ? ACTIVE.includes(job.phase) : false;
  const canStart =
    !starting &&
    !isActive &&
    confirmInput.trim() === confirmPhrase;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Clone Prod → Dev
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
            Replace Firestore <code className="rounded bg-zinc-100 px-1">riverdb-dev</code>{" "}
            with a fresh copy of Prod{" "}
            <code className="rounded bg-zinc-100 px-1">riverdb</code>. Firebase
            Auth is shared and is never modified.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={starting}
        >
          <RefreshCw className={cn("mr-1 h-4 w-4", isActive && "animate-spin")} />
          Refresh status
        </Button>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-sm text-amber-950">
        <p className="font-semibold">Destructive Dev operation</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900/90">
          <li>
            Deletes the entire <strong>riverdb-dev</strong> database, then
            recreates it and imports the latest Prod export.
          </li>
          <li>
            Hosted Dev apps may be unavailable or inconsistent while the job
            runs.
          </li>
          <li>
            After completion, redeploy Dev Firestore rules/indexes if needed:{" "}
            <code className="rounded bg-white/70 px-1">
              ENV=dev DEPLOY_FIRESTORE=1 ./deploy.sh
            </code>
          </li>
          <li>Must be run from Prod Sales Portal (this API uses riverdb).</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <DatabaseBackup className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Current job
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {job ? phaseLabel(job.phase) : "Loading…"}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {job?.message || "Fetching status…"}
              </p>
              {job?.error && (
                <p className="mt-2 text-sm text-red-700">{job.error}</p>
              )}
              {job?.exportUriPrefix && (
                <p className="mt-2 break-all text-xs text-zinc-500">
                  Export: {job.exportUriPrefix}
                </p>
              )}
              {job?.updatedAt && (
                <p className="mt-1 text-xs text-zinc-400">
                  Updated {new Date(job.updatedAt).toLocaleString()}
                </p>
              )}
            </div>

            {isActive && (
              <div className="flex items-center gap-2 text-sm text-teal-800">
                <Loader2 className="h-4 w-4 animate-spin" />
                Clone in progress — this page polls every few seconds.
              </div>
            )}

            <div className="space-y-2 border-t border-zinc-100 pt-4">
              <label className="block text-sm font-medium text-foreground">
                Type{" "}
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
                  {confirmPhrase}
                </code>{" "}
                to start
              </label>
              <input
                value={confirmInput}
                onChange={(event) => setConfirmInput(event.target.value)}
                placeholder={confirmPhrase}
                disabled={starting || isActive}
                autoComplete="off"
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-teal-600/30 placeholder:text-zinc-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <Button
                type="button"
                className="bg-teal-700 hover:bg-teal-800"
                disabled={!canStart}
                onClick={() => void handleStart()}
              >
                {starting ?
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting…
                  </>
                : "Clone latest Prod into riverdb-dev"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
