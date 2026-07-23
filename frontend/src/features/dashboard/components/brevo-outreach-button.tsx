"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { sendOutreachEmail } from "@/features/dashboard/lib/send-outreach-email";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/** Sends a Brevo follow-up instead of opening a mailto: compose window. */
export function BrevoOutreachButton({
  toEmail,
  recipientName,
  businessName,
  subtitle,
  label,
  className,
}: {
  toEmail: string;
  recipientName?: string;
  businessName?: string;
  subtitle?: string;
  label: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (status === "sending" || status === "sent") return;
    setError(null);
    setStatus("sending");
    try {
      await sendOutreachEmail({
        toEmail,
        kind: "generic",
        recipientName,
        businessName,
        subtitle,
      });
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof ApiError ?
          err.message
        : "Could not send email via Brevo.",
      );
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={status === "sending" || status === "sent"}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline disabled:opacity-60",
          className,
        )}
      >
        <Mail className="h-3.5 w-3.5" />
        {status === "sent" ?
          "Sent"
        : status === "sending" ?
          "Sending…"
        : label}
      </button>
      {error ?
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      : null}
    </span>
  );
}
