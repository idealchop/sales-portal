"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminCatalogCollectionManager } from "@/features/admin/components/admin-catalog-collection-manager";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import type { AdminCatalogCollectionId } from "@/lib/admin/catalog-collections";

export function AdminCatalogCollectionPage({
  collectionId,
}: {
  collectionId: AdminCatalogCollectionId;
}) {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const enabled = profile?.role === "admin";

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
    <AdminCatalogCollectionManager
      collectionId={collectionId}
      enabled={enabled}
    />
  );
}
