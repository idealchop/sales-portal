"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  Copy,
  Download,
  Eye,
  History,
  Lightbulb,
  Loader2,
  Megaphone,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CONTENT_STUDIO_SUGGESTIONS,
  type GeneratedSocialPost,
} from "@/features/content-studio/constants";
import { useContentStudioGenerate } from "@/hooks/use-content-studio-generate";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(10, "Describe the image you want in at least 10 characters."),
});

type FormValues = z.infer<typeof formSchema>;

function HistoryPreviewDialog({
  item,
  onClose,
  onCopy,
  onDownload,
}: {
  item: GeneratedSocialPost;
  onClose: () => void;
  onCopy: (text: string) => void;
  onDownload: (imageUrl: string) => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close preview"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200/80"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Generated content
            </h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Created on {item.timestamp}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-900">Visual</p>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt="Generated social media visual"
                className="aspect-video w-full object-cover"
              />
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-900">Caption</p>
            <div className="min-h-[180px] rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">
              {item.caption}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <Button variant="outline" size="sm" onClick={() => onDownload(item.imageUrl)}>
            <Download className="mr-2 h-4 w-4" />
            Download image
          </Button>
          <Button variant="outline" size="sm" onClick={() => onCopy(item.caption)}>
            <Copy className="mr-2 h-4 w-4" />
            Copy caption
          </Button>
        </div>
      </div>
    </div>,
    window.document.body,
  );
}

function InspirationPanel({
  onSelect,
}: {
  onSelect: (suggestion: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50/50">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-zinc-100/60"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-zinc-500 ring-1 ring-zinc-200/70">
            <Lightbulb className="h-3.5 w-3.5" />
          </span>
          <span>
            <span className="block text-sm font-medium text-zinc-800">
              Prompt ideas
            </span>
            <span className="block text-xs text-zinc-500">
              {open ?
                "Tap a suggestion to fill the prompt"
              : `${CONTENT_STUDIO_SUGGESTIONS.length} ready-made scenes`}
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="space-y-1 border-t border-zinc-200/70 px-2 py-2">
          {CONTENT_STUDIO_SUGGESTIONS.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSelect(suggestion)}
              className="group w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-white hover:ring-1 hover:ring-zinc-200/80"
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Idea {index + 1}
              </span>
              <span className="mt-0.5 block text-sm leading-snug text-zinc-700 group-hover:text-zinc-900">
                {suggestion}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContentStudioPage() {
  const { generate, isGenerating, error, clearError } = useContentStudioGenerate();
  const [generatedContent, setGeneratedContent] = useState<GeneratedSocialPost | null>(
    null,
  );
  const [history, setHistory] = useState<GeneratedSocialPost[]>([]);
  const [previewItem, setPreviewItem] = useState<GeneratedSocialPost | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { prompt: "" },
  });

  async function handleGenerate(values: FormValues) {
    clearError();
    setGeneratedContent(null);
    const result = await generate(values.prompt);
    if (!result) return;
    setGeneratedContent(result);
    setHistory((current) => [result, ...current]);
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLabel("Caption copied");
      window.setTimeout(() => setCopiedLabel(null), 2000);
    } catch {
      setCopiedLabel("Unable to copy");
      window.setTimeout(() => setCopiedLabel(null), 2000);
    }
  }

  function handleDownload(imageUrl: string) {
    const link = window.document.createElement("a");
    link.href = imageUrl;
    link.download = `smart-refill-post-${Date.now()}.png`;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
              <Megaphone className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Content Studio
              </h1>
              <p className="mt-1 text-[var(--muted-foreground)]">
                Generate social visuals and captions for Smart Refill marketing.
              </p>
            </div>
          </div>
        </div>
        {copiedLabel && (
          <p className="text-sm font-medium text-teal-700">{copiedLabel}</p>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="border-zinc-200/80 shadow-sm">
          <CardHeader>
            <CardTitle>Create visuals</CardTitle>
            <CardDescription>
              Describe the scene in English, Tagalog, or any Filipino dialect. AI
              generates a 16:9 image and a matching caption.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit(handleGenerate)}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label
                  htmlFor="content-studio-prompt"
                  className="text-sm font-medium text-zinc-700"
                >
                  Image prompt
                </label>
                <textarea
                  id="content-studio-prompt"
                  {...form.register("prompt")}
                  placeholder="e.g., Isang masayang team sa opisina na umiinom ng tubig habang nagtatrabaho, o describe your scene in English, Tagalog, Bisaya, Ilocano…"
                  className="min-h-[140px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-teal-500/30 transition focus:border-teal-500 focus:ring-2"
                />
                {form.formState.errors.prompt && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.prompt.message}
                  </p>
                )}
              </div>

              <InspirationPanel
                onSelect={(suggestion) =>
                  form.setValue("prompt", suggestion, { shouldValidate: true })
                }
              />

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-[var(--primary)] to-teal-500 hover:from-[var(--primary-dark)] hover:to-teal-600"
              >
                {isGenerating ?
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                : <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate content
                  </>
                }
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 shadow-sm">
          <CardHeader>
            <CardTitle>Review content</CardTitle>
            <CardDescription>
              Your generated visual and caption appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isGenerating && (
              <div className="flex h-[420px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
                <p className="text-sm text-[var(--muted-foreground)]">
                  Creating your image and caption. This may take a moment.
                </p>
              </div>
            )}

            {!isGenerating && !generatedContent && (
              <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 text-center">
                <Sparkles className="h-10 w-10 text-zinc-300" />
                <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
                  Generated content will appear here once you submit a prompt.
                </p>
              </div>
            )}

            {generatedContent && !isGenerating && (
              <div className="space-y-5">
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={generatedContent.imageUrl}
                    alt="Generated social media visual"
                    className="aspect-video w-full object-cover"
                  />
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Caption
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap">
                    {generatedContent.caption}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(generatedContent.imageUrl)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download image
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(generatedContent.caption)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy caption
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {history.length > 0 && (
        <Card className="border-zinc-200/80 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-zinc-500" />
                <div>
                  <CardTitle>Generation history</CardTitle>
                  <CardDescription>
                    Reopen, copy, or download previous results from this session.
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistory([])}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((item, index) => (
              <div
                key={`${item.timestamp}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {item.prompt}
                  </p>
                  <p className="text-xs text-zinc-500">{item.timestamp}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Preview"
                    onClick={() => setPreviewItem(item)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Copy caption"
                    onClick={() => handleCopy(item.caption)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Download image"
                    onClick={() => handleDownload(item.imageUrl)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {previewItem && (
        <HistoryPreviewDialog
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onCopy={handleCopy}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}
