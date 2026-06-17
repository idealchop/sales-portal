"use client";

import Link from "next/link";
import { CheckCircle2, Mail, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TodaysWorkItem } from "@/lib/dashboard/analytics";

const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-zinc-100 text-zinc-700",
} as const;

const SOURCE_LABELS: Record<TodaysWorkItem["source"], string> = {
  sales_action: "Workspace",
  ai_insight: "AI insight",
  approval: "Approval",
  proposal: "Proposal",
};

export function TodaysWorkInbox({
  items,
}: {
  items: TodaysWorkItem[];
}) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="h-4 w-4 text-teal-600" />
          Today&apos;s work
        </CardTitle>
        <CardDescription>
          One ranked inbox — workspace outreach, AI priorities, approvals, and
          your pipeline combined.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--border)] p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{item.title}</p>
                <Badge className={PRIORITY_STYLES[item.priority]}>
                  {item.priority}
                </Badge>
                <Badge variant="secondary">{SOURCE_LABELS[item.source]}</Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {item.subtitle}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.email ?
                  <a
                    href={`mailto:${item.email}?subject=${encodeURIComponent(`SmartRefill — ${item.title}`)}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email owner
                  </a>
                : null}
                {item.href ?
                  <Link
                    href={item.href}
                    className="text-xs font-medium text-teal-700 hover:underline"
                  >
                    Open →
                  </Link>
                : null}
              </div>
            </div>
            {item.source === "ai_insight" ?
              <Sparkles className="h-4 w-4 shrink-0 text-teal-600" />
            : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
