"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { inputClassName } from "../lib/form-styles";
import { resourceShareHint } from "../lib/resource-share-url";

export function ShareableLinkField({
  url,
  title,
  status,
  visibility,
  className,
}: {
  url: string;
  title?: string;
  status: string;
  visibility: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);
  const hint = resourceShareHint({ status, visibility });

  useEffect(() => {
    setShareSupported(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function handleShare() {
    if (!shareSupported) {
      await handleCopy();
      return;
    }
    try {
      await navigator.share({
        title: title?.trim() || "Smart Refill story",
        text: title?.trim() || "Watch on Smart Refill Resources",
        url,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await handleCopy();
    }
  }

  return (
    <section
      className={cn(
        "space-y-2 rounded-2xl border border-teal-100 bg-teal-50/50 p-4",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-foreground">
            Shareable link
          </h4>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          readOnly
          className={cn(inputClassName, "bg-white font-mono text-xs")}
          value={url}
          aria-label="Shareable link"
          onFocus={(event) => event.currentTarget.select()}
        />
        <div className="flex shrink-0 gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full bg-white"
            onClick={() => void handleCopy()}
          >
            {copied ? (
              <Check className="mr-1.5 h-3.5 w-3.5 text-teal-700" />
            ) : (
              <Copy className="mr-1.5 h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            onClick={() => void handleShare()}
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            Share
          </Button>
        </div>
      </div>
    </section>
  );
}
