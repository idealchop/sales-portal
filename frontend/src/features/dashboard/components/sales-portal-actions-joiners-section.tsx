"use client";

import { useState } from "react";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import { DashboardSegmentTabs } from "@/features/dashboard/components/dashboard-segment-tabs";
import { NewJoinersPanel } from "@/features/dashboard/components/new-joiners-panel";
import { TodaysWorkInbox } from "@/features/dashboard/components/todays-work-inbox";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics";
import type { SalesPortalRole } from "@/lib/auth-status";
import type { DashboardAnalyticsRefresh } from "@/hooks/use-dashboard-analytics";

export function SalesPortalActionsJoinersSection({
  data,
  role,
  refresh,
}: {
  data: DashboardAnalytics;
  role?: SalesPortalRole;
  refresh: DashboardAnalyticsRefresh;
}) {
  const [tab, setTab] = useState<"actions" | "joiners">("actions");
  const workCount = data.todaysWork?.length ?? 0;
  const joinerCount =
    (data.newJoiners?.salesReps.length ?? 0) +
    (data.newJoiners?.businesses.length ?? 0) +
    (data.newJoiners?.platformUsers.length ?? 0);

  return (
    <DashboardSection
      id="sales-portal-actions"
      title="Actions & joiners"
      count={workCount + joinerCount}
    >
      <DashboardSegmentTabs
        activeId={tab}
        onChange={(id) => setTab(id as "actions" | "joiners")}
        tabs={[
          { id: "actions", label: "Actions", count: workCount },
          { id: "joiners", label: "New joiners", count: joinerCount },
        ]}
      />
      {tab === "actions" ?
        <TodaysWorkInbox items={data.todaysWork ?? []} embedded />
      : <NewJoinersPanel
          newJoiners={data.newJoiners}
          role={role}
          onRevoked={refresh}
          embedded
        />
      }
    </DashboardSection>
  );
}
