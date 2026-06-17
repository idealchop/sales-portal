"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardSegmentTab = {
  id: string;
  label: string;
  count?: number;
};

export function DashboardSegmentTabs({
  tabs,
  activeId,
  onChange,
}: {
  tabs: DashboardSegmentTab[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          type="button"
          size="sm"
          variant={activeId === tab.id ? "primary" : "outline"}
          className={cn("h-8 px-3 text-xs font-semibold uppercase tracking-wide")}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count !== undefined ? ` · ${tab.count}` : ""}
        </Button>
      ))}
    </div>
  );
}
