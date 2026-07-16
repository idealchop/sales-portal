"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import {
  deleteWrsBlog,
  fetchWrsBlogs,
  formatPricePesos,
  updateWrsBlog,
} from "../lib/events-training-api";
import type { BlogStatus, WrsBlogRecord } from "../lib/events-training-types";
import { tutorialTargetAppLabel } from "../lib/events-training-types";
import {
  inferPrivateAudience,
  privateAudienceLabel,
} from "../lib/private-audience";
import { BlogFormDialog } from "./blog-form-dialog";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { VideoStatusPicker } from "./video-status-picker";

function visibilityLabel(item: WrsBlogRecord): string {
  const visibility = item.visibility ?? "public";
  if (visibility === "premium") {
    const cents = item.priceCents ?? 0;
    return cents > 0 ? `Premium · ${formatPricePesos(cents)}` : "Premium";
  }
  if (visibility === "public") return "Public";
  return privateAudienceLabel(
    inferPrivateAudience({
      allowAllMembers: item.allowAllMembers !== false,
      allowedPlanCodes: item.allowedPlanCodes ?? [],
    }),
  );
}

export function BlogsAdminPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const [items, setItems] = useState<WrsBlogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WrsBlogRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WrsBlogRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchWrsBlogs());
    } catch {
      setError("Unable to load articles.");
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

  function openCreate() {
    setEditingItem(null);
    setFormOpen(true);
    setError(null);
  }

  function openEdit(item: WrsBlogRecord) {
    setEditingItem(item);
    setFormOpen(true);
    setError(null);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingItem(null);
  }

  async function handleStatusChange(item: WrsBlogRecord, status: BlogStatus) {
    if (item.status === status) return;
    setStatusUpdatingId(item.id);
    setError(null);
    try {
      const updated = await updateWrsBlog(item.id, { status });
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, ...updated } : row)),
      );
      setEditingItem((current) =>
        current?.id === item.id ? { ...current, ...updated } : current,
      );
    } catch {
      setError("Unable to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setSubmitting(true);
    setError(null);
    try {
      await deleteWrsBlog(id);
      if (editingItem?.id === id) closeForm();
      await load();
    } catch {
      setError("Unable to delete article.");
      throw new Error("Unable to delete article.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Articles</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            WRS Blog posts for{" "}
            <code className="rounded bg-muted px-1 text-xs">
              /resources/blogs
            </code>
            .
          </p>
        </div>
        <Button type="button" className="rounded-full" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> Add article
        </Button>
      </div>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">
            All articles
            {!loading ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({items.length})
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {!loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 px-6 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">No articles yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a written article to publish on Resources.
                </p>
              </div>
              <Button
                type="button"
                className="rounded-full"
                onClick={openCreate}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add article
              </Button>
            </div>
          ) : null}
          <ul className="divide-y divide-zinc-100">
            {items.map((item) => {
              const selected = formOpen && editingItem?.id === item.id;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex gap-4 py-4 first:pt-0 last:pb-0",
                    selected && "rounded-lg bg-teal-50/50 px-3 -mx-1",
                  )}
                >
                  <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200">
                    {item.heroImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.heroImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">
                        <FileText className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <p className="font-medium leading-snug text-foreground">
                          {item.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <VideoStatusPicker
                            value={item.status}
                            disabled={
                              statusUpdatingId === item.id || submitting
                            }
                            onChange={(status) => {
                              void handleStatusChange(item, status);
                            }}
                          />
                          <Badge className="bg-sky-50 text-sky-900">
                            {visibilityLabel(item)}
                          </Badge>
                          <Badge className="bg-zinc-100 text-zinc-700">
                            {tutorialTargetAppLabel(item.appId ?? "smartrefill")}
                          </Badge>
                          {item.featured ? (
                            <Badge className="gap-1 border-amber-200 bg-amber-50 text-amber-900">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                              featured
                            </Badge>
                          ) : null}
                          {item.allowAnonymousComments !== false ? (
                            <Badge className="bg-violet-50 text-violet-800">
                              comments
                            </Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.authorName?.trim()
                            ? `${item.authorName.trim()} · `
                            : ""}
                          /{item.slug}
                          {item.excerpt ? ` · ${item.excerpt}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={submitting}
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <BlogFormDialog
        open={formOpen}
        initial={editingItem}
        onClose={closeForm}
        onSaved={load}
      />

      {deleteTarget ? (
        <ConfirmDeleteDialog
          title="Delete this article?"
          itemLabel={deleteTarget.title}
          description="This removes the article from Resources. This action cannot be undone."
          confirmLabel="Delete article"
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </div>
  );
}
