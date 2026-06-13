"use client";

import { UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function PhotoLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close photo"
        className="absolute inset-0 bg-black/70 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] max-w-3xl flex-col items-end gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="bg-white/90 text-zinc-800 hover:bg-white"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[80vh] max-w-[min(90vw,48rem)] object-contain"
          />
        </div>
      </div>
    </div>
  );
}

export function DataManagementUserAvatar({
  photoURL,
  displayName,
}: {
  photoURL?: string;
  displayName: string;
}) {
  const [enlarged, setEnlarged] = useState(false);

  if (!photoURL) {
    return <UserRound className="h-4 w-4 shrink-0 text-zinc-400" />;
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setEnlarged(true);
        }}
        className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-teal-200"
        aria-label={`View ${displayName} photo`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoURL}
          alt={displayName}
          className="h-full w-full object-cover"
        />
      </button>
      {enlarged && (
        <PhotoLightbox
          src={photoURL}
          alt={displayName}
          onClose={() => setEnlarged(false)}
        />
      )}
    </>
  );
}
