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
  ScrollText,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessInsightsSection } from "@/features/admin/components/business-insights-section";
import { BusinessSubcollectionListSection } from "@/features/admin/components/business-subcollection-list-section";
import { BusinessTransactionListSection } from "@/features/admin/components/business-transaction-list-section";
import {
  BusinessCatalogSection,
  BusinessUserFeedbackSection,
  BusinessWorkspaceOnboardingProgress,
  BusinessWorkspaceUiConfig,
} from "@/features/admin/components/business-workspace-config-sections";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import { SmartRefillConfigPanel } from "@/features/dashboard/components/smartrefill-config-panel";
import type { BusinessFirestoreDocumentRow } from "@/lib/admin/business-profile-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import type { ProfileField } from "@/lib/admin/user-profile-display";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type BusinessOverviewTab =
  | "insights"
  | "workspace"
  | "catalog"
  | "collections"
  | "config";

type SubcollectionGroup = {
  collectionId: string;
  title: string;
  documents: unknown[];
};

type WorkspaceFieldProps = {
  primaryFields: ProfileField[];
  otherFields: ProfileField[];
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
  otherFields,
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
  catalogItemCount: number;
  subcollectionGroups: SubcollectionGroup[];
  primaryFields: WorkspaceFieldProps["primaryFields"];
  otherFields: WorkspaceFieldProps["otherFields"];
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

          {otherFields.length > 0 && (
            <div
              className={cn(
                primaryFields.length > 0 && "mt-8 border-t border-zinc-200/80 pt-8",
              )}
            >
              <h5 className="mb-5 text-sm font-semibold tracking-tight text-zinc-800">
                Other info
              </h5>
              <div className="grid gap-5 sm:grid-cols-2">
                {otherFields.map((field) => (
                  <ProfileFormField
                    key={field.key}
                    label={field.label}
                    icon={fieldIcon(field.key)}
                    className={
                      field.kind === "photo" || field.key === "email" ?
                        "sm:col-span-2"
                      : undefined
                    }
                  >
                    <ProfileFieldContent field={field} />
                  </ProfileFormField>
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
          id="business-transactions"
          title="Transactions"
          description="Ledger records for this workspace"
        >
          <BusinessTransactionListSection
            businessId={businessId}
            onSaveDocument={onSaveDocument}
            onRemoveDocument={onRemoveDocument}
          />
        </DashboardSection>
      </div>
    );
  }

  if (tab === "catalog" && root) {
    return (
      <div className="space-y-6">
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
    if (subcollectionGroups.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-3 text-sm font-medium text-zinc-800">
            No subcollections yet
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Firestore subcollections for this business will appear here.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {subcollectionGroups.map((group) => (
          <BusinessSubcollectionListSection
            key={group.collectionId}
            collectionId={group.collectionId}
            title={group.title}
            documents={group.documents as UserFirestoreDocumentRow[]}
            onSaveDocument={onSaveDocument}
            onRemoveDocument={onRemoveDocument}
          />
        ))}
      </div>
    );
  }

  if (tab === "config") {
    return (
      <div className="space-y-6">
        {root ?
          <DashboardSection
            id="business-ui-config"
            title="Workspace UI config"
            description="Client-persisted flags for this workspace"
          >
            <BusinessWorkspaceUiConfig data={root.data} />
          </DashboardSection>
        : null}

        <DashboardSection
          id="business-smartrefill-config"
          title="SmartRefill app config"
          description="Global product icons and subscription catalog settings"
        >
          <SmartRefillConfigPanel />
        </DashboardSection>
      </div>
    );
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
  onAiToolRuns,
  aiToolRunsCount,
  onChat,
  chatCount,
  onSupportAiKnowledge,
  supportAiKnowledgeCount,
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
  onAiToolRuns: () => void;
  aiToolRunsCount: number;
  onChat: () => void;
  chatCount: number;
  onSupportAiKnowledge: () => void;
  supportAiKnowledgeCount: number;
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
