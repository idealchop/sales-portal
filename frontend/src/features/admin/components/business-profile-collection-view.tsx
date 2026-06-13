"use client";

import {
  Bell,
  BookOpen,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ContactRound,
  CreditCard,
  Eye,
  FileStack,
  Fingerprint,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Pencil,
  Phone,
  QrCode,
  ScrollText,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BusinessSubcollectionDialog } from "@/features/admin/components/business-subcollection-dialog";
import { DeleteBusinessFirestoreDialog } from "@/features/admin/components/delete-business-firestore-dialog";
import { EditFirestoreDocDialog } from "@/features/admin/components/edit-firestore-doc-dialog";
import { CopyableUserId } from "@/features/admin/components/copyable-user-id";
import {
  dataManagementStatusLabel,
  formatActiveSubscriptionTitle,
  formatMemberBreakdown,
  type DataManagementLinkRow,
  type DataManagementLinkStatus,
} from "@/lib/admin/data-management";
import { BusinessInsightsSection } from "@/features/admin/components/business-insights-section";
import { BusinessLocationMinimapLoader } from "@/features/admin/components/business-location-minimap-loader";
import { BusinessSupportAiKnowledgeDialog } from "@/features/admin/components/business-support-ai-knowledge-dialog";
import {
  BusinessCatalogSection,
  BusinessUserFeedbackSection,
  BusinessWorkspaceOnboardingFields,
} from "@/features/admin/components/business-workspace-config-sections";
import { BusinessSubcollectionListSection } from "@/features/admin/components/business-subcollection-list-section";
import { BusinessTransactionListSection } from "@/features/admin/components/business-transaction-list-section";
import { TeamDetailDialog } from "@/features/admin/components/team-detail-dialog";
import { ProactiveScheduleWeekSnapshotDialog } from "@/features/admin/components/proactive-schedule-week-snapshot-dialog";
import {
  businessLogoFromData,
  businessNameFromData,
  formatBusinessFilesSummary,
  formatPaymentInfoSummary,
  formatPortalOrderRatingsSummary,
  formatProactiveScheduleWeekSnapshotsSummary,
  splitBusinessDocuments,
  splitBusinessRootFields,
  type BusinessFirestoreDocumentRow,
} from "@/lib/admin/business-profile-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import {
  formatProfileScalar,
  formatProfileTimestamp,
  type ProfileField,
} from "@/lib/admin/user-profile-display";
import { formatSubscriptionPeriod } from "@/lib/dashboard/subscription-labels";
import { useAdminBusinessTransactions } from "@/hooks/use-admin-business-transactions";
import { ALL_BUSINESS_TRANSACTION_TYPES } from "@/lib/admin/business-insights-display";
import { supportAiKnowledgeDialogCount } from "@/lib/admin/private-usage-list-display";
import { buildBusinessMapLocation } from "@/lib/admin/business-location-display";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<DataManagementLinkStatus, string> = {
  linked: "border-emerald-200/80 bg-emerald-50/80 text-emerald-800",
  no_business: "border-amber-200/80 bg-amber-50/80 text-amber-800",
  no_user: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

const FIELD_ICON_MAP: Record<string, LucideIcon> = {
  name: Building2,
  displayName: Building2,
  ownerId: Fingerprint,
  email: Mail,
  phone: Phone,
  address: MapPin,
  city: MapPin,
  province: MapPin,
  onboardingComplete: CheckCircle2,
  allowManualTransactionReference: CheckCircle2,
  logo: Building2,
  logoURL: Building2,
  photoURL: Building2,
  createdAt: Clock,
  updatedAt: Clock,
  role: UserRound,
  planName: CreditCard,
  status: CheckCircle2,
  calendarDayUtc: Calendar,
};

function fieldIcon(key: string): LucideIcon {
  return FIELD_ICON_MAP[key] ?? Building2;
}

function PhotoLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Close photo"
        className="absolute inset-0 bg-black/70 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] max-w-3xl flex-col items-end gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="bg-white/90 text-zinc-800 hover:bg-white"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[80vh] max-w-[min(90vw,48rem)] object-contain"
          />
        </div>
      </div>
    </div>
  );
}

function ProfileFormField({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100/80 text-zinc-500">
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="text-[13px] font-medium text-zinc-600">{label}</span>
      </div>
      <div className="rounded-lg bg-white px-3.5 py-2.5 text-sm leading-relaxed text-zinc-900 ring-1 ring-zinc-200/70">
        {children}
      </div>
    </div>
  );
}

function ProfileFieldContent({ field }: { field: ProfileField }) {
  if (field.kind === "photo" && typeof field.value === "string" && field.value) {
    return (
      <div className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={field.value}
          alt={field.label}
          className="h-16 w-16 rounded-lg border border-zinc-200 object-cover"
        />
        <a
          href={field.value}
          target="_blank"
          rel="noreferrer"
          className="block break-all text-xs text-teal-700 hover:underline"
        >
          {field.value}
        </a>
      </div>
    );
  }

  if (field.kind === "boolean") {
    return <span className="text-zinc-700">{field.value === true ? "Yes" : "No"}</span>;
  }

  const formatted =
    field.kind === "timestamp" ?
      formatProfileTimestamp(field.value)
    : formatProfileScalar(field.value);

  return formatted ?
      <span className="break-words text-zinc-800">{formatted}</span>
    : <span className="text-zinc-400">Not set</span>;
}

function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-1.5 h-8 w-0.5 shrink-0 rounded-full bg-teal-500/70" />
        <div>
          <h4 className="text-[15px] font-semibold tracking-tight text-zinc-900">
            {title}
          </h4>
          {description && (
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {actions}
        </div>
      )}
    </div>
  );
}

function SidebarViewButton({
  ariaLabel,
  onClick,
}: {
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-7 shrink-0 p-0 text-zinc-500 hover:text-zinc-800"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <Eye className="h-3.5 w-3.5" />
    </Button>
  );
}

function SidebarCard({
  title,
  icon: Icon,
  children,
  headerAction,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  headerAction?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200/70">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-500">
            <Icon className="h-4 w-4" />
          </span>
          <h4 className="text-sm font-semibold tracking-tight text-zinc-900">
            {title}
          </h4>
        </div>
        {headerAction}
      </div>
      {children}
    </div>
  );
}

export function BusinessProfileCollectionView({
  documents,
  isLoading,
  error,
  row,
  businessId,
  onSaveDocument,
  onRemoveDocument,
  onRemoveBusinessTree,
}: {
  documents: BusinessFirestoreDocumentRow[];
  isLoading: boolean;
  error: string | null;
  row: DataManagementLinkRow;
  businessId: string;
  onSaveDocument: (
    path: string,
    data: Record<string, unknown>,
  ) => Promise<UserFirestoreDocumentRow>;
  onRemoveDocument: (path: string) => Promise<void>;
  onRemoveBusinessTree: () => Promise<void>;
}) {
  const [editRootOpen, setEditRootOpen] = useState(false);
  const [deleteTreeOpen, setDeleteTreeOpen] = useState(false);
  const [auditLogsOpen, setAuditLogsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [customersOpen, setCustomersOpen] = useState(false);
  const [aiToolRunsOpen, setAiToolRunsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [supportAiKnowledgeOpen, setSupportAiKnowledgeOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [paymentInfoOpen, setPaymentInfoOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [portalOrderRatingsOpen, setPortalOrderRatingsOpen] = useState(false);
  const [proactiveScheduleWeekSnapshotsOpen, setProactiveScheduleWeekSnapshotsOpen] =
    useState(false);
  const [rawSubmissionsOpen, setRawSubmissionsOpen] = useState(false);
  const [logoEnlarged, setLogoEnlarged] = useState(false);

  const {
    root,
    subcollectionGroups,
    membersGroup,
    subscriptionsGroup,
    customersGroup,
    aiToolRunsGroup,
    chatSessionsGroup,
    supportAiKnowledgeGroup,
    privateGroup,
    inventoryItemsGroup,
    auditLogsGroup,
    notificationsGroup,
    paymentInfoGroup,
    filesGroup,
    portalOrderRatingsGroup,
    proactiveScheduleWeekSnapshotsGroup,
    rawSubmissionsGroup,
  } = splitBusinessDocuments(documents);
  const { primaryFields, otherFields } =
    root ? splitBusinessRootFields(root.data) : { primaryFields: [], otherFields: [] };
  const displayName =
    row.businessName || businessNameFromData(root?.data) || businessId;
  const businessLogo = businessLogoFromData(root?.data);
  const subcollectionCount = new Set(
    documents.filter((doc) => !doc.isRoot).map((doc) => doc.collectionId),
  ).size;

  const { transactions, isLoading: transactionsLoading } =
    useAdminBusinessTransactions(
      businessId,
      [...ALL_BUSINESS_TRANSACTION_TYPES],
      Boolean(businessId),
    );

  const supportAiKnowledgeCount = supportAiKnowledgeDialogCount(
    (privateGroup?.documents ?? []) as UserFirestoreDocumentRow[],
    (supportAiKnowledgeGroup?.documents ?? []) as UserFirestoreDocumentRow[],
  );
  const businessMapLocation =
    root ?
      buildBusinessMapLocation({
        businessId,
        name: displayName,
        data: root.data,
        activeSubscription: row.activeSubscription,
      })
    : null;

  if (isLoading && documents.length === 0) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4 rounded-2xl bg-zinc-50/50 p-6 ring-1 ring-zinc-200/60">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-lg bg-white" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
      <div className="rounded-2xl bg-zinc-50/40 p-6 ring-1 ring-zinc-200/60">
        <div className="space-y-10">
          <BusinessInsightsSection
            documents={documents}
            transactions={transactions}
            transactionsLoading={transactionsLoading}
          />

          {root && (
            <section>
              <SectionHeader
                title="Workspace information"
                description="Core fields stored on the business record"
                actions={
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-zinc-500 hover:text-zinc-800"
                      aria-label="Edit workspace"
                      disabled={!root}
                      onClick={() => setEditRootOpen(true)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                      aria-label="Remove workspace"
                      onClick={() => setDeleteTreeOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="relative h-9 w-9 p-0 text-zinc-500 hover:text-zinc-800"
                      aria-label={
                        auditLogsGroup && auditLogsGroup.documents.length > 0 ?
                          `Audit logs (${auditLogsGroup.documents.length})`
                        : "Audit logs"
                      }
                      onClick={() => setAuditLogsOpen(true)}
                    >
                      <ScrollText className="h-4 w-4" />
                      {auditLogsGroup && auditLogsGroup.documents.length > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
                          {auditLogsGroup.documents.length}
                        </span>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="relative h-9 w-9 p-0 text-zinc-500 hover:text-zinc-800"
                      aria-label={
                        notificationsGroup &&
                        notificationsGroup.documents.length > 0 ?
                          `Notifications (${notificationsGroup.documents.length})`
                        : "Notifications"
                      }
                      onClick={() => setNotificationsOpen(true)}
                    >
                      <Bell className="h-4 w-4" />
                      {notificationsGroup &&
                        notificationsGroup.documents.length > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
                            {notificationsGroup.documents.length}
                          </span>
                        )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="relative h-9 w-9 p-0 text-zinc-500 hover:text-zinc-800"
                      aria-label={
                        customersGroup && customersGroup.documents.length > 0 ?
                          `Customers (${customersGroup.documents.length})`
                        : "Customers"
                      }
                      onClick={() => setCustomersOpen(true)}
                    >
                      <ContactRound className="h-4 w-4" />
                      {customersGroup && customersGroup.documents.length > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
                          {customersGroup.documents.length}
                        </span>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="relative h-9 w-9 p-0 text-zinc-500 hover:text-zinc-800"
                      aria-label={
                        aiToolRunsGroup && aiToolRunsGroup.documents.length > 0 ?
                          `AI run tools (${aiToolRunsGroup.documents.length})`
                        : "AI run tools"
                      }
                      onClick={() => setAiToolRunsOpen(true)}
                    >
                      <Bot className="h-4 w-4" />
                      {aiToolRunsGroup && aiToolRunsGroup.documents.length > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
                          {aiToolRunsGroup.documents.length}
                        </span>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="relative h-9 w-9 p-0 text-zinc-500 hover:text-zinc-800"
                      aria-label={
                        chatSessionsGroup &&
                        chatSessionsGroup.documents.length > 0 ?
                          `Chat (${chatSessionsGroup.documents.length})`
                        : "Chat"
                      }
                      onClick={() => setChatOpen(true)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      {chatSessionsGroup &&
                        chatSessionsGroup.documents.length > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
                            {chatSessionsGroup.documents.length}
                          </span>
                        )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="relative h-9 w-9 p-0 text-zinc-500 hover:text-zinc-800"
                      aria-label={
                        supportAiKnowledgeCount > 0 ?
                          `Support AI knowledge (${supportAiKnowledgeCount})`
                        : "Support AI knowledge"
                      }
                      onClick={() => setSupportAiKnowledgeOpen(true)}
                    >
                      <BookOpen className="h-4 w-4" />
                      {supportAiKnowledgeCount > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
                            {supportAiKnowledgeCount}
                          </span>
                        )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="relative h-9 w-9 p-0 text-zinc-500 hover:text-zinc-800"
                      aria-label={
                        inventoryItemsGroup &&
                        inventoryItemsGroup.documents.length > 0 ?
                          `Inventory (${inventoryItemsGroup.documents.length})`
                        : "Inventory"
                      }
                      onClick={() => setInventoryOpen(true)}
                    >
                      <Package className="h-4 w-4" />
                      {inventoryItemsGroup &&
                        inventoryItemsGroup.documents.length > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
                            {inventoryItemsGroup.documents.length}
                          </span>
                        )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="relative h-9 w-9 p-0 text-zinc-500 hover:text-zinc-800"
                      aria-label={
                        rawSubmissionsGroup &&
                        rawSubmissionsGroup.documents.length > 0 ?
                          `Raw submissions (${rawSubmissionsGroup.documents.length})`
                        : "Raw submissions"
                      }
                      onClick={() => setRawSubmissionsOpen(true)}
                    >
                      <QrCode className="h-4 w-4" />
                      {rawSubmissionsGroup &&
                        rawSubmissionsGroup.documents.length > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
                            {rawSubmissionsGroup.documents.length}
                          </span>
                        )}
                    </Button>
                  </>
                }
              />
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
                <div className={cn(primaryFields.length > 0 && "mt-8 border-t border-zinc-200/80 pt-8")}>
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

              <div
                className={cn(
                  (primaryFields.length > 0 || otherFields.length > 0) &&
                    "mt-8 border-t border-zinc-200/80 pt-8",
                )}
              >
                <h5 className="mb-5 text-sm font-semibold tracking-tight text-zinc-800">
                  Onboarding & UI
                </h5>
                <BusinessWorkspaceOnboardingFields data={root.data} />
              </div>

              <BusinessTransactionListSection
                businessId={businessId}
                onSaveDocument={onSaveDocument}
                onRemoveDocument={onRemoveDocument}
              />
            </section>
          )}

          {root && (
            <>
              <BusinessUserFeedbackSection data={root.data} />
              <BusinessCatalogSection data={root.data} />
            </>
          )}

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

          {!root && subcollectionGroups.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="mt-3 text-sm font-medium text-zinc-800">
                No workspace data yet
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Firestore documents for this business will appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-0">
        <div className="relative rounded-2xl bg-white ring-1 ring-zinc-200/70">
          <div className="relative h-20 overflow-hidden rounded-t-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-teal-800">
            <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_50%)]" />
            <div className="absolute -right-6 top-0 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
          </div>
          <div className="relative z-10 -mt-11 flex justify-center px-5">
            {businessLogo ?
              <button
                type="button"
                onClick={() => setLogoEnlarged(true)}
                className="h-[88px] w-[88px] overflow-hidden rounded-full border-[3px] border-white bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)] ring-1 ring-zinc-200/80 transition hover:shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
                aria-label={`View ${displayName} logo`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={businessLogo}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              </button>
            : <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full border-[3px] border-white bg-teal-50 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-zinc-200/80">
                <Building2 className="h-9 w-9 text-teal-700" />
              </div>
            }
          </div>
          <div className="px-5 pb-5 pt-3">
            <div className="text-center">
              <h3 className="text-lg font-semibold tracking-tight text-zinc-900">
                {displayName}
              </h3>
              {row.ownerDisplayName && (
                <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm text-zinc-500">
                  <UserRound className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Owner · {row.ownerDisplayName}</span>
                </p>
              )}
              <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
                <Badge className={cn("font-normal", STATUS_STYLES[row.status])}>
                  {dataManagementStatusLabel(row.status)}
                </Badge>
              </div>
            </div>
            <div className="mt-5 rounded-lg bg-zinc-50 px-3 py-3 ring-1 ring-zinc-200/50">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Business ID
              </p>
              <div className="mt-1.5">
                <CopyableUserId
                  uid={businessId}
                  label=""
                  copyLabel="business ID"
                  muted
                />
              </div>
            </div>
          </div>
        </div>

        {businessMapLocation && (
          <SidebarCard title="Location" icon={MapPin}>
            <BusinessLocationMinimapLoader location={businessMapLocation} />
          </SidebarCard>
        )}

        <SidebarCard
          title="Team"
          icon={Users}
          headerAction={
            <SidebarViewButton
              ariaLabel="View team members"
              onClick={() => setTeamOpen(true)}
            />
          }
        >
          <p className="text-sm text-zinc-700">
            {formatMemberBreakdown(row.memberBreakdown) ?? "0 admins · 0 riders"}
          </p>
        </SidebarCard>

        <SidebarCard
          title="Subscription"
          icon={CreditCard}
          headerAction={
            <SidebarViewButton
              ariaLabel="View subscriptions"
              onClick={() => setSubscriptionOpen(true)}
            />
          }
        >
          {row.activeSubscription ?
            <div className="space-y-1">
              <p className="font-medium leading-snug text-zinc-900">
                {formatActiveSubscriptionTitle(row.activeSubscription)}
              </p>
              <p className="text-sm text-zinc-500">
                {formatSubscriptionPeriod(row.activeSubscription)}
              </p>
            </div>
          : <p className="text-sm text-zinc-500">No active plan</p>}
        </SidebarCard>

        <SidebarCard
          title="Payment info"
          icon={Wallet}
          headerAction={
            <SidebarViewButton
              ariaLabel="View payment info"
              onClick={() => setPaymentInfoOpen(true)}
            />
          }
        >
          <p className="text-sm text-zinc-700">
            {formatPaymentInfoSummary(paymentInfoGroup?.documents ?? [])}
          </p>
        </SidebarCard>

        <SidebarCard
          title="Files"
          icon={FileStack}
          headerAction={
            <SidebarViewButton
              ariaLabel="View files"
              onClick={() => setFilesOpen(true)}
            />
          }
        >
          <p className="text-sm text-zinc-700">
            {formatBusinessFilesSummary(filesGroup?.documents ?? [])}
          </p>
        </SidebarCard>

        <SidebarCard
          title="Portal order ratings"
          icon={Star}
          headerAction={
            <SidebarViewButton
              ariaLabel="View portal order ratings"
              onClick={() => setPortalOrderRatingsOpen(true)}
            />
          }
        >
          <p className="text-sm text-zinc-700">
            {formatPortalOrderRatingsSummary(
              portalOrderRatingsGroup?.documents ?? [],
            )}
          </p>
        </SidebarCard>

        <SidebarCard
          title="Proactive schedule week snapshots"
          icon={Calendar}
          headerAction={
            <SidebarViewButton
              ariaLabel="View proactive schedule week snapshots"
              onClick={() => setProactiveScheduleWeekSnapshotsOpen(true)}
            />
          }
        >
          <p className="text-sm text-zinc-700">
            {formatProactiveScheduleWeekSnapshotsSummary(
              proactiveScheduleWeekSnapshotsGroup?.documents ?? [],
            )}
          </p>
        </SidebarCard>
      </aside>

      {root && editRootOpen && (
        <EditFirestoreDocDialog
          doc={root as UserFirestoreDocumentRow}
          onClose={() => setEditRootOpen(false)}
          onSave={async (data) => {
            await onSaveDocument(root.path, data);
            setEditRootOpen(false);
          }}
        />
      )}

      {deleteTreeOpen && (
        <DeleteBusinessFirestoreDialog
          businessName={displayName}
          businessId={businessId}
          subcollectionCount={subcollectionCount}
          onClose={() => setDeleteTreeOpen(false)}
          onConfirm={onRemoveBusinessTree}
        />
      )}

      {auditLogsOpen && (
        <BusinessSubcollectionDialog
          title="Audit logs"
          description="Activity recorded for this workspace"
          collectionId="audit_logs"
          maxWidthClass="max-w-5xl"
          documents={(auditLogsGroup?.documents ?? []) as UserFirestoreDocumentRow[]}
          onClose={() => setAuditLogsOpen(false)}
          onSaveDocument={onSaveDocument}
          onRemoveDocument={onRemoveDocument}
        />
      )}

      {notificationsOpen && (
        <BusinessSubcollectionDialog
          title="Notifications"
          description="Notification records for this workspace"
          collectionId="notifications"
          maxWidthClass="max-w-6xl"
          documents={
            (notificationsGroup?.documents ?? []) as UserFirestoreDocumentRow[]
          }
          onClose={() => setNotificationsOpen(false)}
          onSaveDocument={onSaveDocument}
          onRemoveDocument={onRemoveDocument}
        />
      )}

      {customersOpen && (
        <BusinessSubcollectionDialog
          title="Customers"
          description="End-customer records for this workspace"
          collectionId="customers"
          businessId={businessId}
          documents={
            (customersGroup?.documents ?? []) as UserFirestoreDocumentRow[]
          }
          onClose={() => setCustomersOpen(false)}
          onSaveDocument={onSaveDocument}
          onRemoveDocument={onRemoveDocument}
        />
      )}

      {aiToolRunsOpen && (
        <BusinessSubcollectionDialog
          title="AI run tools"
          description="AI tool execution history for this workspace"
          collectionId="ai_tool_runs"
          maxWidthClass="max-w-4xl"
          documents={
            (aiToolRunsGroup?.documents ?? []) as UserFirestoreDocumentRow[]
          }
          onClose={() => setAiToolRunsOpen(false)}
          onSaveDocument={onSaveDocument}
          onRemoveDocument={onRemoveDocument}
        />
      )}

      {chatOpen && (
        <BusinessSubcollectionDialog
          title="Chat"
          description="Chat sessions for this workspace"
          collectionId="chat_sessions"
          maxWidthClass="max-w-4xl"
          documents={
            (chatSessionsGroup?.documents ?? []) as UserFirestoreDocumentRow[]
          }
          onClose={() => setChatOpen(false)}
          onSaveDocument={onSaveDocument}
          onRemoveDocument={onRemoveDocument}
        />
      )}

      {supportAiKnowledgeOpen && (
        <BusinessSupportAiKnowledgeDialog
          usageDocuments={
            (privateGroup?.documents ?? []) as UserFirestoreDocumentRow[]
          }
          knowledgeDocuments={
            (supportAiKnowledgeGroup?.documents ?? []) as UserFirestoreDocumentRow[]
          }
          onClose={() => setSupportAiKnowledgeOpen(false)}
          onSaveDocument={onSaveDocument}
          onRemoveDocument={onRemoveDocument}
        />
      )}

      {inventoryOpen && (
        <BusinessSubcollectionDialog
          title="Inventory"
          description="Inventory items for this workspace"
          collectionId="inventory_items"
          documents={
            (inventoryItemsGroup?.documents ?? []) as UserFirestoreDocumentRow[]
          }
          onClose={() => setInventoryOpen(false)}
          onSaveDocument={onSaveDocument}
          onRemoveDocument={onRemoveDocument}
        />
      )}

      {teamOpen && (
        <TeamDetailDialog
          members={(membersGroup?.documents ?? []) as UserFirestoreDocumentRow[]}
          relatedDocuments={documents as UserFirestoreDocumentRow[]}
          onClose={() => setTeamOpen(false)}
          onSaveDocument={onSaveDocument}
          onRemoveDocument={onRemoveDocument}
        />
      )}

      {subscriptionOpen && (
        <BusinessSubcollectionDialog
          title="Subscriptions"
          description="Subscription records for this workspace"
          collectionId="subscriptions"
          maxWidthClass="max-w-xl"
          documents={
            (subscriptionsGroup?.documents ?? []) as UserFirestoreDocumentRow[]
          }
          onClose={() => setSubscriptionOpen(false)}
          onSaveDocument={onSaveDocument}
          onRemoveDocument={onRemoveDocument}
        />
      )}

      {paymentInfoOpen && (
        <BusinessSubcollectionDialog
          title="Payment info"
          description="Bank accounts and payment methods for this workspace"
          collectionId="payment_info"
          maxWidthClass="max-w-xl"
          documents={
            (paymentInfoGroup?.documents ?? []) as UserFirestoreDocumentRow[]
          }
          onClose={() => setPaymentInfoOpen(false)}
          onSaveDocument={onSaveDocument}
          onRemoveDocument={onRemoveDocument}
        />
      )}

      {filesOpen && (
        <BusinessSubcollectionDialog
          title="Files"
          description="Uploaded files and images for this workspace"
          collectionId="files"
          maxWidthClass="max-w-xl"
          documents={(filesGroup?.documents ?? []) as UserFirestoreDocumentRow[]}
          onClose={() => setFilesOpen(false)}
          onSaveDocument={onSaveDocument}
          onRemoveDocument={onRemoveDocument}
        />
      )}

      {portalOrderRatingsOpen && (
        <BusinessSubcollectionDialog
          title="Portal order ratings"
          description="Customer ratings for portal orders in this workspace"
          collectionId="portal_order_ratings"
          maxWidthClass="max-w-xl"
          documents={
            (portalOrderRatingsGroup?.documents ?? []) as UserFirestoreDocumentRow[]
          }
          onClose={() => setPortalOrderRatingsOpen(false)}
          onSaveDocument={onSaveDocument}
          onRemoveDocument={onRemoveDocument}
        />
      )}

      {proactiveScheduleWeekSnapshotsOpen && (
        <ProactiveScheduleWeekSnapshotDialog
          documents={
            (proactiveScheduleWeekSnapshotsGroup?.documents ??
              []) as UserFirestoreDocumentRow[]
          }
          onClose={() => setProactiveScheduleWeekSnapshotsOpen(false)}
          onSaveDocument={onSaveDocument}
          onRemoveDocument={onRemoveDocument}
        />
      )}

      {rawSubmissionsOpen && (
        <BusinessSubcollectionDialog
          title="Raw submissions"
          description="Portal QR orders and submissions awaiting or completed review"
          collectionId="raw_submissions"
          maxWidthClass="max-w-5xl"
          documents={
            (rawSubmissionsGroup?.documents ?? []) as UserFirestoreDocumentRow[]
          }
          onClose={() => setRawSubmissionsOpen(false)}
          onSaveDocument={onSaveDocument}
          onRemoveDocument={onRemoveDocument}
        />
      )}

      {logoEnlarged && businessLogo && (
        <PhotoLightbox
          src={businessLogo}
          alt={`${displayName} logo`}
          onClose={() => setLogoEnlarged(false)}
        />
      )}
    </div>
  );
}
