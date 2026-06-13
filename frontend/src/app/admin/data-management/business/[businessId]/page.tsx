import { Suspense } from "react";
import { AdminDataManagementBusinessPage } from "@/features/admin/components/admin-data-management-business-page";

function BusinessPageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)]" />
    </div>
  );
}

export default function AdminDataManagementBusinessRoute() {
  return (
    <Suspense fallback={<BusinessPageFallback />}>
      <AdminDataManagementBusinessPage />
    </Suspense>
  );
}
