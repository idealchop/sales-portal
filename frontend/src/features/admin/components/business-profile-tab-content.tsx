"use client";

import {
  Bell,
  BookOpen,
  Bot,
  ContactRound,
  MessageSquare,
  Package,
  Pencil,
  QrCode,
  Receipt,
  ScrollText,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessInsightsSection } from "@/features/admin/components/business-insights-section";
import { BusinessCollectionsPanel } from "@/features/admin/components/business-collections-panel";
import { BusinessConfigPanel } from "@/features/admin/components/business-config-panel";
import {
  BusinessCatalogSection,
  BusinessUserFeedbackSection,
  BusinessWorkspaceOnboardingProgress,
} from "@/features/admin/components/business-workspace-config-sections";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import type { BusinessFirestoreDocumentRow } from "@/lib/admin/business-profile-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import type { ProfileField } from "@/lib/admin/user-profile-display";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type BusinessOverviewTab =
  | "insights"
  | "workspace"
  | "collections"
  | "config";

type SubcollectionGroup = {
  collectionId: string;
  title: string;
  documents: unknown[];
  totalCount?: number;
};

type WorkspaceFieldProps = {
  primaryFields: ProfileField[];
  otherInfoGroups: Array<{
    id: string;
    title: string;
    fields: ProfileField[];
  }>;
  ProfileFormField: (props: {
    label: string;
    icon?: LucideIcon;
    className?: string;
    children: ReactNode;
  }) => ReactNode;
  ProfileFieldContent: (props: { field: ProfileField }) => ReactNode;
  fieldIcon: (key: string) => LucideIcon;
};

export function BusinessProfileTabContent({
  tab,
  root,
  businessId,
  documents,
  collectionCounts,
  transactions,
  transactionsLoading,
  insightsStatCount,
  catalogItemCount,
  subcollectionGroups,
  primaryFields,
  otherInfoGroups,
  ProfileFormField,
  ProfileFieldContent,
  fieldIcon,
  workspaceActions,
  onSaveDocument,
  onRemoveDocument,
}: {
  tab: BusinessOverviewTab;
  root: BusinessFirestoreDocumentRow | null;
  businessId: string;
  documents: BusinessFirestoreDocumentRow[];
  collectionCounts?: Record<string, number>;
  transactions: UserFirestoreDocumentRow[];
  transactionsLoading?: boolean;
  insightsStatCount: number;
  catalogItemCount?: number;
  subcollectionGroups: SubcollectionGroup[];
  primaryFields: WorkspaceFieldProps["primaryFields"];
  otherInfoGroups: WorkspaceFieldProps["otherInfoGroups"];
  ProfileFormField: WorkspaceFieldProps["ProfileFormField"];
  ProfileFieldContent: WorkspaceFieldProps["ProfileFieldContent"];
  fieldIcon: WorkspaceFieldProps["fieldIcon"];
  workspaceActions: ReactNode;
  onSaveDocument: (
    path: string,
    data: Record<string, unknown>,
  ) => Promise<UserFirestoreDocumentRow>;
  onRemoveDocument: (path: string) => Promise<void>;
}) {
  if (tab === "insights") {
    return (
      <DashboardSection
        id="business-insights"
        title="Insights"
        description="Workspace activity, trends, and subscription consumption"
        count={insightsStatCount}
      >
        <BusinessInsightsSection
          documents={documents}
          collectionCounts={collectionCounts}
          transactions={transactions}
          transactionsLoading={transactionsLoading}
        />
      </DashboardSection>
    );
  }

  if (tab === "workspace" && root) {
    return (
      <div className="space-y-6">
        <DashboardSection
          id="business-workspace-info"
          title="Workspace information"
          description="Core fields stored on the business record"
          action={workspaceActions}
        >
          {primaryFields.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              {primaryFields.map((field) => (
                <ProfileFormField
                  key={field.key}
                  label={field.label}
                  icon={fieldIcon(field.key)}
                  className={
                    field.key === "address" || field.key === "email" ?
                      "sm:col-span-2"
                    : undefined
                  }
                >
                  <ProfileFieldContent field={field} />
                </ProfileFormField>
              ))}
            </div>
          )}

          {otherInfoGroups.length > 0 && (
            <div
              className={cn(
                primaryFields.length > 0 && "mt-8 border-t border-zinc-200/80 pt-8",
              )}
            >
              <h5 className="mb-5 text-sm font-semibold tracking-tight text-zinc-800">
                Other info
              </h5>
              <div className="space-y-8">
                {otherInfoGroups.map((group) => (
                  <div key={group.id}>
                    <h6 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {group.title}
                    </h6>
                    <div className="grid gap-5 sm:grid-cols-2">
                      {group.fields.map((field) => (
                        <ProfileFormField
                          key={field.key}
                          label={field.label}
                          icon={fieldIcon(field.key)}
                          className={
                            field.kind === "photo" || field.key === "banner" ?
                              "sm:col-span-2"
                            : undefined
                          }
                        >
                          <ProfileFieldContent field={field} />
                        </ProfileFormField>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DashboardSection>

        <DashboardSection
          id="business-onboarding"
          title="Onboarding progress"
          description="Getting started and quick tour completion"
        >
          <BusinessWorkspaceOnboardingProgress data={root.data} />
        </DashboardSection>

        <DashboardSection
          id="business-feedback"
          title="User feedback"
          description="Latest platform feedback snapshot for this workspace"
        >
          <BusinessUserFeedbackSection data={root.data} />
        </DashboardSection>

        <DashboardSection
          id="business-catalog"
          title="Catalog"
          description="Workspace lookup data configured during onboarding"
          count={catalogItemCount}
        >
          <BusinessCatalogSection data={root.data} />
        </DashboardSection>
      </div>
    );
  }

  if (tab === "collections") {
    return (
      <BusinessCollectionsPanel
        groups={subcollectionGroups}
        businessId={businessId}
        onSaveDocument={onSaveDocument}
        onRemoveDocument={onRemoveDocument}
      />
    );
  }

  if (tab === "config") {
    return <BusinessConfigPanel rootData={root?.data ?? null} />;
  }

  if (!root) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-zinc-300" />
        <p className="mt-3 text-sm font-medium text-zinc-800">No workspace data yet</p>
        <p className="mt-1 text-sm text-zinc-500">
          Firestore documents for this business will appear here.
        </p>
      </div>
    );
  }

  return null;
}

export function WorkspaceQuickActions({
  onEdit,
  onDelete,
  onAuditLogs,
  auditLogsCount,
  onNotifications,
  notificationsCount,
  onCustomers,
  customersCount,
  onTransactions,
  transactionsCount,
  onAiToolRuns,
  aiToolRunsCount,
  onChat,
  chatCount,
  onSupportAiKnowledge,
  supportAiKnowledgeCount,
  onProducts,
  productsCount,
  onInventory,
  inventoryCount,
  onRawSubmissions,
  rawSubmissionsCount,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onAuditLogs: () => void;
  auditLogsCount: number;
  onNotifications: () => void;
  notificationsCount: number;
  onCustomers: () => void;
  customersCount: number;
  onTransactions: () => void;
  transactionsCount: number;
  onAiToolRuns: () => void;
  aiToolRunsCount: number;
  onChat: () => void;
  chatCount: number;
  onSupportAiKnowledge: () => void;
  supportAiKnowledgeCount: number;
  onProducts: () => void;
  productsCount: number;
  onInventory: () => void;
  inventoryCount: number;
  onRawSubmissions: () => void;
  rawSubmissionsCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0 text-zinc-500 hover:text-zinc-800"
        aria-label="Edit workspace"
        onClick={onEdit}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
        aria-label="Remove workspace"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <QuickActionIconButton
        icon={ScrollText}
        label="Audit logs"
        count={auditLogsCount}
        onClick={onAuditLogs}
      />
      <QuickActionIconButton
        icon={Bell}
        label="Notifications"
        count={notificationsCount}
        onClick={onNotifications}
      />
      <QuickActionIconButton
        icon={ContactRound}
        label="Customers"
        count={customersCount}
        onClick={onCustomers}
      />
      <QuickActionIconButton
        icon={Receipt}
        label="Transactions"
        count={transactionsCount}
        onClick={onTransactions}
      />
      <QuickActionIconButton
        icon={Bot}
        label="AI run tools"
        count={aiToolRunsCount}
        onClick={onAiToolRuns}
      />
      <QuickActionIconButton
        icon={MessageSquare}
        label="Chat"
        count={chatCount}
        onClick={onChat}
      />
      <QuickActionIconButton
        icon={BookOpen}
        label="Support AI knowledge"
        count={supportAiKnowledgeCount}
        onClick={onSupportAiKnowledge}
      />
      <QuickActionIconButton
        icon={ShoppingBag}
        label="Products"
        count={productsCount}
        onClick={onProducts}
      />
      <QuickActionIconButton
        icon={Package}
        label="Inventory"
        count={inventoryCount}
        onClick={onInventory}
      />
      <QuickActionIconButton
        icon={QrCode}
        label="Raw submissions"
        count={rawSubmissionsCount}
        onClick={onRawSubmissions}
      />
    </div>
  );
}

function QuickActionIconButton({
  icon: Icon,
  label,
  count,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="relative h-9 w-9 p-0 text-zinc-500 hover:text-zinc-800"
      aria-label={count > 0 ? `${label} (${count})` : label}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
          {count}
        </span>
      )}
    </Button>
  );
}
