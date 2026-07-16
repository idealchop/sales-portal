"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  fetchModerationInbox,
  fetchRegistrations,
} from "../lib/events-training-api";
import {
  EVENTS_TRAINING_NAV_GROUPS,
  isEventsTrainingNavActive,
} from "../lib/events-training-nav";

type AttentionCounts = {
  pendingRegistrations: number;
  moderationTodo: number;
};

export function EventsTrainingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [attention, setAttention] = useState<AttentionCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchRegistrations({ status: "pending" }),
      fetchModerationInbox(),
    ])
      .then(([regs, inbox]) => {
        if (cancelled) return;
        setAttention({
          pendingRegistrations: regs.length,
          moderationTodo:
            (inbox.counts.openQuestions ?? 0) +
            (inbox.counts.flaggedComments ?? 0),
        });
      })
      .catch(() => {
        if (!cancelled) setAttention(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  function badgeFor(href: string): number | null {
    if (!attention) return null;
    if (href === "/events-training/registrations") {
      return attention.pendingRegistrations;
    }
    if (href === "/events-training/moderation") {
      return attention.moderationTodo;
    }
    return null;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Events & Training
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resources content and webinar ops
          </p>
        </div>

        <nav
          aria-label="Events and Training"
          className="-mx-1 overflow-x-auto px-1"
        >
          <div className="flex min-w-max items-end gap-1 border-b border-zinc-200">
            {EVENTS_TRAINING_NAV_GROUPS.map((group, groupIndex) => (
              <div key={group.id} className="flex items-end">
                {groupIndex > 0 ? (
                  <span
                    aria-hidden
                    className="mx-2 mb-2.5 h-4 w-px shrink-0 bg-zinc-200"
                  />
                ) : null}
                <div className="flex items-end gap-0.5">
                  {group.items.map((item) => {
                    const active = isEventsTrainingNavActive(
                      pathname,
                      item.href,
                    );
                    const count = badgeFor(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "relative inline-flex items-center gap-1.5 px-3 py-2.5 text-sm transition",
                          active
                            ? "font-semibold text-teal-800"
                            : "font-medium text-zinc-500 hover:text-zinc-800",
                        )}
                      >
                        {item.label}
                        {count != null && count > 0 ? (
                          <span
                            className={cn(
                              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                              active
                                ? "bg-teal-700 text-white"
                                : "bg-amber-500 text-white",
                            )}
                          >
                            {count > 99 ? "99+" : count}
                          </span>
                        ) : null}
                        {active ? (
                          <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-teal-700" />
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </header>

      <div>{children}</div>
    </div>
  );
}
