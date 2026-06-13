"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyableUserId({
  uid,
  label = "User ID",
  copyLabel = "user ID",
  muted = false,
  className,
}: {
  uid: string;
  label?: string;
  copyLabel?: string;
  muted?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyUid(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(uid);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = uid;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <span
      className={cn("inline-flex flex-wrap items-center gap-1.5", className)}
      onClick={(event) => event.stopPropagation()}
    >
      {label && (
        <span className="text-xs font-medium text-zinc-500">{label}</span>
      )}
      <code
        className={cn(
          "max-w-full truncate rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs",
          muted ? "text-zinc-400" : "text-zinc-700",
        )}
      >
        {uid}
      </code>
      <button
        type="button"
        onClick={(event) => void copyUid(event)}
        className="inline-flex items-center rounded-md p-1 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
        aria-label={copied ? `${copyLabel} copied` : `Copy ${copyLabel}`}
      >
        {copied ?
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        : <Copy className="h-3.5 w-3.5" />
        }
      </button>
    </span>
  );
}
