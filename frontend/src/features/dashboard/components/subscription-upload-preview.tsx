"use client";

import Image from "next/image";
import { ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OwnerSubscription } from "@/lib/dashboard/analytics";
import {
  getSubscriptionAttachments,
  type SubscriptionAttachment,
} from "@/lib/dashboard/subscription-attachments";

function AttachmentImage({
  attachment,
}: {
  attachment: SubscriptionAttachment;
}) {
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block h-24 w-32 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white"
      title={`Open ${attachment.label}`}
    >
      <Image
        src={attachment.url}
        alt={attachment.label}
        fill
        className="object-contain p-1 transition group-hover:opacity-90"
        unoptimized
      />
      <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[10px] font-medium text-white">
        {attachment.label}
      </span>
    </a>
  );
}

function AttachmentFileLink({
  attachment,
}: {
  attachment: SubscriptionAttachment;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-1.5"
      asChild
    >
      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
        {attachment.kind === "pdf" ?
          <FileText className="h-3.5 w-3.5" />
        : <ExternalLink className="h-3.5 w-3.5" />}
        {attachment.label}
      </a>
    </Button>
  );
}

export function SubscriptionUploadPreview({
  subscription,
}: {
  subscription: OwnerSubscription;
}) {
  const attachments = getSubscriptionAttachments(subscription);
  if (attachments.length === 0) return null;

  const images = attachments.filter((attachment) => attachment.kind === "image");
  const files = attachments.filter((attachment) => attachment.kind !== "image");

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Uploaded proof
      </p>
      {images.length > 0 ?
        <div className="flex flex-wrap gap-2">
          {images.map((attachment) => (
            <AttachmentImage key={attachment.url} attachment={attachment} />
          ))}
        </div>
      : null}
      {files.length > 0 ?
        <div className="flex flex-wrap gap-2">
          {files.map((attachment) => (
            <AttachmentFileLink key={attachment.url} attachment={attachment} />
          ))}
        </div>
      : null}
    </div>
  );
}
