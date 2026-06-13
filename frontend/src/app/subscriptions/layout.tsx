import type { ReactNode } from "react";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";

export default function SubscriptionsLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
