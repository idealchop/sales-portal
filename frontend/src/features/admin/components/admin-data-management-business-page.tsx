"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BusinessProfileCollectionView } from "@/features/admin/components/business-profile-collection-view";
import { useAdminBusinessDocuments } from "@/hooks/use-admin-business-documents";
import { useAdminDataManagement } from "@/hooks/use-admin-data-management";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import type { DataManagementLinkRow } from "@/lib/admin/data-management";
import { dataManagementPath } from "@/lib/admin/data-management-url-state";
import { cn } from "@/lib/utils";

function fallbackRow(businessId: string, userId?: string): DataManagementLinkRow {
  return {
    businessId,
    userId,
    status: "linked",
  };
}

export function AdminDataManagementBusinessPage() {
  const router = useRouter();
  const params = useParams<{ businessId: string }>();
  const searchParams = useSearchParams();
  const businessId = params.businessId;
  const returnTo = searchParams.get("returnTo") || dataManagementPath();
  const userId = searchParams.get("userId") || undefined;

  const { profile, loading: profileLoading } = useSalesProfile();
  const { overview, isLoading: overviewLoading } = useAdminDataManagement();
  const {
    documents,
    isLoading,
    error,
    refresh,
    saveDocument,
    removeDocument,
    removeBusinessTree,
  } = useAdminBusinessDocuments(businessId, Boolean(businessId));

  const row = useMemo(() => {
    if (!overview || !businessId) {
      return fallbackRow(businessId, userId);
    }

    const ownerRow = overview.owners.find((item) => item.businessId === businessId);
    if (ownerRow) return ownerRow;

    if (userId) {
      const ownerByUser = overview.owners.find((item) => item.userId === userId);
      if (ownerByUser) return ownerByUser;
    }

    return fallbackRow(businessId, userId);
  }, [businessId, overview, userId]);

  useEffect(() => {
    if (profileLoading) return;
    if (profile?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [profile?.role, profileLoading, router]);

  if (profileLoading || profile?.role !== "admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50"
            onClick={() => router.push(returnTo)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to data management
          </Button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700/90">
              Workspace management
            </p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
              Business overview
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Firestore workspace record and subcollections for this business.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={isLoading || overviewLoading}
        >
          <RefreshCw
            className={cn(
              "mr-1 h-4 w-4",
              (isLoading || overviewLoading) && "animate-spin",
            )}
          />
          Refresh
        </Button>
      </div>

      <div className="rounded-2xl bg-[#fafafa] p-6 ring-1 ring-zinc-200/80">
        <BusinessProfileCollectionView
          documents={documents}
          isLoading={isLoading}
          error={error}
          row={row}
          businessId={businessId}
          onSaveDocument={saveDocument}
          onRemoveDocument={removeDocument}
          onRemoveBusinessTree={async () => {
            await removeBusinessTree();
            router.push(returnTo);
          }}
        />
      </div>
    </div>
  );
}
