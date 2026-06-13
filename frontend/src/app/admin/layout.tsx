import type { ReactNode } from "react";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
