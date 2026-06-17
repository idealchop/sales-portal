import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DashboardSection({
  id,
  title,
  description,
  count,
  action,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: string;
  count?: number | string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
            {title}
          </h2>
          {count !== undefined ?
            <Badge className="bg-zinc-100 text-zinc-700">{count}</Badge>
          : null}
        </div>
        {action}
      </div>
      {description ?
        <p className="text-xs text-[var(--muted-foreground)]">{description}</p>
      : null}
      {children}
    </section>
  );
}
