"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminCatalogCollectionManager } from "@/features/admin/components/admin-catalog-collection-manager";
import { TrialPolicyManager } from "@/features/admin/components/trial-policy-manager";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import type { AdminCatalogCollectionId } from "@/lib/admin/catalog-collections";

const SALES_ROLES = new Set(["sales", "manager", "admin"]);

export function AdminCatalogCollectionPage({
  collectionId,
}: {
  collectionId: AdminCatalogCollectionId;
}) {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const enabled = Boolean(profile?.role && SALES_ROLES.has(profile.role));

  useEffect(() => {
    if (profileLoading) return;
    if (!enabled) {
      router.replace("/dashboard");
    }
  }, [enabled, profileLoading, router]);

  if (profileLoading || !enabled) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)]" />
      </div>
    );
  }

  if (collectionId === "subscription_trial_policy") {
    return <TrialPolicyManager enabled={enabled} />;
  }

  return (
    <AdminCatalogCollectionManager
      collectionId={collectionId}
      enabled={enabled}
    />
  );
}
