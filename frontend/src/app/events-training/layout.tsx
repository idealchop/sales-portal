import type { ReactNode } from "react";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { EventsTrainingShell } from "@/features/events-training/components/events-training-shell";

export default function EventsTrainingLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell>
      <EventsTrainingShell>{children}</EventsTrainingShell>
    </DashboardShell>
  );
}
