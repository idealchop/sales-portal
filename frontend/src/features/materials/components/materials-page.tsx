"use client";

import { useMemo, useState } from "react";
import { ExternalLink, FileText, Plus, Trash2, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSalesMaterials } from "@/hooks/use-sales-materials";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import {
  createSalesMaterial,
  deleteSalesMaterial,
  type SalesMaterial,
  updateSalesMaterial,
} from "@/lib/sales/api";

const inputClassName =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-foreground outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

function MaterialIcon({ type }: { type: SalesMaterial["type"] }) {
  if (type === "video") return <Video className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export function MaterialsPage() {
  const { isAdmin } = useSalesProfile();
  const { materials, isLoading, error, refresh } = useSalesMaterials();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<SalesMaterial["type"]>("link");

  const filteredMaterials = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return materials;
    return materials.filter(
      (material) =>
        material.title.toLowerCase().includes(query) ||
        (material.description || "").toLowerCase().includes(query),
    );
  }, [materials, searchQuery]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setUrl("");
    setType("link");
    setFormError(null);
  }

  function startEdit(material: SalesMaterial) {
    setEditingId(material.id);
    setTitle(material.title);
    setDescription(material.description || "");
    setUrl(material.url);
    setType(material.type);
    setFormError(null);
  }

  async function handleSave() {
    if (!title.trim() || !url.trim()) {
      setFormError("Title and URL are required.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        url: url.trim(),
        type,
      };

      if (editingId) {
        await updateSalesMaterial(editingId, payload);
      } else {
        await createSalesMaterial(payload);
      }

      resetForm();
      await refresh();
    } catch {
      setFormError("Unable to save material.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(materialId: string) {
    setSubmitting(true);
    try {
      await deleteSalesMaterial(materialId);
      if (editingId === materialId) resetForm();
      await refresh();
    } catch {
      setFormError("Unable to delete material.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sales Materials</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Brochures, explainers, and assets for client conversations.
        </p>
      </div>

      <input
        className={inputClassName}
        placeholder="Search materials…"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
      />

      {isAdmin ?
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit material" : "Add material"}</CardTitle>
            <CardDescription>Admin-only catalog management.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              className={inputClassName}
              placeholder="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <input
              className={inputClassName}
              placeholder="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <input
              className={inputClassName}
              placeholder="URL"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            <select
              className={inputClassName}
              value={type}
              onChange={(event) =>
                setType(event.target.value as SalesMaterial["type"])
              }
            >
              <option value="link">Link</option>
              <option value="pdf">PDF</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
            {formError ?
              <p className="text-sm text-red-600">{formError}</p>
            : null}
            <div className="flex gap-2">
              <Button disabled={submitting} onClick={() => void handleSave()}>
                <Plus className="mr-2 h-4 w-4" />
                {editingId ? "Update" : "Add"}
              </Button>
              {editingId ?
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              : null}
            </div>
          </CardContent>
        </Card>
      : null}

      <Card>
        <CardHeader>
          <CardTitle>Library</CardTitle>
          <CardDescription>
            {filteredMaterials.length} material
            {filteredMaterials.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ?
            <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
          : error ?
            <p className="text-sm text-red-600">{error}</p>
          : filteredMaterials.length === 0 ?
            <p className="text-sm text-[var(--muted-foreground)]">
              No materials found.
            </p>
          : filteredMaterials.map((material) => (
              <div
                key={material.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MaterialIcon type={material.type} />
                    <p className="font-medium text-foreground">{material.title}</p>
                    <Badge>{material.type}</Badge>
                  </div>
                  {material.description ?
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {material.description}
                    </p>
                  : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button href={material.url} variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open
                  </Button>
                  {isAdmin ?
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(material)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={submitting}
                        onClick={() => void handleDelete(material.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  : null}
                </div>
              </div>
            ))
          }
        </CardContent>
      </Card>
    </div>
  );
}
