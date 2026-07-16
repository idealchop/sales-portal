"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import {
  fetchCertifications,
  fetchTrainingVideos,
  fetchWebinars,
  issueCertification,
  revokeCertification,
} from "../lib/events-training-api";
import type {
  CertTargetType,
  CertificationRecord,
  TrainingVideoRecord,
  WebinarRecord,
} from "../lib/events-training-types";
import { CERT_TARGET_TYPES } from "../lib/events-training-types";
import { inputClassName, labelClassName } from "../lib/form-styles";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

export function CertificationsAdminPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const [items, setItems] = useState<CertificationRecord[]>([]);
  const [webinars, setWebinars] = useState<WebinarRecord[]>([]);
  const [videos, setVideos] = useState<TrainingVideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<CertificationRecord | null>(
    null,
  );
  const [userId, setUserId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [targetType, setTargetType] = useState<CertTargetType>("training_video");
  const [targetId, setTargetId] = useState("");
  const [title, setTitle] = useState("");
  const [certificateUrl, setCertificateUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [certs, events, vids] = await Promise.all([
        fetchCertifications(),
        fetchWebinars(),
        fetchTrainingVideos(),
      ]);
      setItems(certs);
      setWebinars(events);
      setVideos(vids);
    } catch {
      setError("Unable to load certifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (profile?.role !== "admin" && profile?.role !== "manager") {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [load, profile?.role, profileLoading, router]);

  async function handleIssue() {
    if (!userId.trim() || !targetId.trim() || !title.trim()) {
      setError("User ID, target, and title are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await issueCertification({
        userId: userId.trim(),
        businessId: businessId.trim() || undefined,
        targetType,
        targetId,
        title: title.trim(),
        certificateUrl: certificateUrl.trim() || null,
      });
      setFormOpen(false);
      setUserId("");
      setBusinessId("");
      setTargetId("");
      setTitle("");
      setCertificateUrl("");
      await load();
    } catch {
      setError("Unable to issue certification.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeConfirm() {
    if (!revokeTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      await revokeCertification(revokeTarget.id);
      await load();
    } catch {
      setError("Unable to revoke certification.");
      throw new Error("Unable to revoke certification.");
    } finally {
      setSubmitting(false);
    }
  }

  const targets = targetType === "webinar_event" ? webinars : videos;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Certifications</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manually issue or revoke optional training certificates.
          </p>
        </div>
        {!formOpen ? (
          <Button type="button" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Issue certificate
          </Button>
        ) : null}
      </div>

      {formOpen ? (
        <Card className="border-teal-200">
          <CardHeader className="flex flex-row items-start justify-between border-b bg-teal-50/40 pb-4">
            <CardTitle className="text-base">Issue certificate</CardTitle>
            <Button type="button" size="sm" variant="ghost" onClick={() => setFormOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
            {error ? (
              <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div>
              <label className={labelClassName}>Member user ID</label>
              <input
                className={inputClassName}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClassName}>Business ID (optional)</label>
              <input
                className={inputClassName}
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClassName}>Target type</label>
              <select
                className={inputClassName}
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value as CertTargetType);
                  setTargetId("");
                }}
              >
                {CERT_TARGET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName}>Target</label>
              <select
                className={inputClassName}
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              >
                <option value="">Select…</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClassName}>Certificate title</label>
              <input
                className={inputClassName}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClassName}>Certificate URL (optional)</label>
              <input
                className={inputClassName}
                value={certificateUrl}
                onChange={(e) => setCertificateUrl(e.target.value)}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void handleIssue()}
              >
                {submitting ? "Issuing…" : "Issue"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Issued certificates {!loading ? `(${items.length})` : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {!loading && items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12">
              <Award className="h-5 w-5 text-zinc-400" />
              <p className="font-medium">No certificates yet</p>
            </div>
          ) : null}
          <ul className="divide-y">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.userId} · {item.targetType}/{item.targetId}
                    {item.issuedAt
                      ? ` · ${new Date(item.issuedAt).toLocaleDateString("en-PH", {
                          timeZone: "Asia/Manila",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}`
                      : ""}
                  </p>
                  <Badge
                    className={
                      item.status === "issued"
                        ? "mt-1.5 bg-emerald-50 text-emerald-800"
                        : "mt-1.5 bg-zinc-100 text-zinc-600"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
                {item.status === "issued" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => setRevokeTarget(item)}
                  >
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {revokeTarget ? (
        <ConfirmDeleteDialog
          title="Revoke this certification?"
          itemLabel={revokeTarget.title || revokeTarget.userId}
          description="The member will no longer see this certificate as valid. You can issue a new one later if needed."
          confirmLabel="Revoke certificate"
          busyLabel="Revoking…"
          onClose={() => setRevokeTarget(null)}
          onConfirm={handleRevokeConfirm}
        />
      ) : null}
    </div>
  );
}
