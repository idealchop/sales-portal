import type { ReactNode } from "react";

/**
 * Shared page chrome for Events & Training admin surfaces.
 * Keeps titles/descriptions consistent without dashboard clutter.
 */
export function EventsTrainingPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={
            eyebrow
              ? "mt-1 text-xl font-semibold tracking-tight text-foreground"
              : "text-lg font-semibold tracking-tight text-foreground"
          }
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
