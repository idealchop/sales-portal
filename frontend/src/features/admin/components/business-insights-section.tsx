"use client";

import { useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { SignInAttendanceHeatmap } from "@/features/admin/components/sign-in-attendance-heatmap";
import { useAdminCatalogCollection } from "@/hooks/use-admin-catalog-collection";
import { useAdminBusinessSubcollection } from "@/hooks/use-admin-business-subcollection";
import { useAdminUserDocuments } from "@/hooks/use-admin-user-documents";
import {
  computeBusinessInsights,
  consumptionMeterState,
} from "@/lib/admin/business-insights-display";
import type { BusinessFirestoreDocumentRow } from "@/lib/admin/business-profile-display";
import {
  buildSignInHeatmap,
  loginDayCountsFromEvents,
} from "@/lib/admin/sign-in-attendance-heatmap";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { splitUserDocuments } from "@/lib/admin/user-profile-display";
import { cn } from "@/lib/utils";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900">
        {value}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ConsumptionRow({
  label,
  used,
  cap,
  suffix,
}: {
  label: string;
  used: number;
  cap: number;
  suffix?: string;
}) {
  const { percent, isBlocked, isNearLimit } = consumptionMeterState(
    used,
    cap,
  );

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        isBlocked ?
          "border-red-200 bg-red-50/60"
        : isNearLimit ?
          "border-amber-200 bg-amber-50/60"
        : "border-zinc-200 bg-white",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
          {label}
        </p>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums text-zinc-900",
            isBlocked && "text-red-700",
          )}
        >
          {used}/{cap}
          {suffix ?
            <span className="font-medium text-zinc-500"> {suffix}</span>
          : null}
        </span>
      </div>
      <div className="mt-2">
        <Progress value={percent} />
      </div>
    </div>
  );
}

export function BusinessInsightsSection({
  businessId,
  documents,
  collectionCounts,
  transactions,
  transactionsLoading,
}: {
  businessId?: string;
  documents: BusinessFirestoreDocumentRow[];
  collectionCounts?: Record<string, number>;
  transactions: UserFirestoreDocumentRow[];
  transactionsLoading?: boolean;
}) {
  const { documents: productIcons } = useAdminCatalogCollection(
    "product_icons",
    true,
  );
  const { documents: productDocs } = useAdminBusinessSubcollection(
    businessId,
    "products",
    Boolean(businessId),
    documents.filter((doc) => doc.collectionId === "products"),
    collectionCounts?.products,
  );
  const insightDocuments = useMemo(() => {
    const withoutProducts = documents.filter(
      (doc) => doc.collectionId !== "products",
    );
    return [...withoutProducts, ...productDocs];
  }, [documents, productDocs]);
  const insights = useMemo(
    () =>
      computeBusinessInsights({
        documents: insightDocuments,
        transactions,
        collectionCounts,
        productIcons,
      }),
    [collectionCounts, insightDocuments, productIcons, transactions],
  );

  const ownerId = useMemo(() => {
    const root = documents.find((doc) => doc.isRoot);
    const id = root?.data.ownerId;
    return typeof id === "string" && id.trim() ? id.trim() : null;
  }, [documents]);
  const { documents: ownerDocuments, isLoading: ownerDocsLoading } =
    useAdminUserDocuments(ownerId, Boolean(ownerId));
  const signInHeatmap = useMemo(() => {
    const { loginEvents } = splitUserDocuments(ownerDocuments);
    return buildSignInHeatmap(
      loginDayCountsFromEvents(loginEvents),
      new Date().getUTCFullYear(),
    );
  }, [ownerDocuments]);

  const hasConsumption = insights.consumption.length > 0;

  return (
    <section className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {insights.stats.map((stat) => (
          <StatCard key={stat.id} label={stat.label} value={stat.value} />
        ))}
      </div>

      <ChartCard
        title="Sign-in attendance"
        description={
          ownerId ?
            `Days the workspace owner signed in during ${signInHeatmap.year} · ${signInHeatmap.signedInDays} day${signInHeatmap.signedInDays === 1 ? "" : "s"}`
          : "No owner is linked on this workspace, so sign-in days cannot be plotted"
        }
      >
        <SignInAttendanceHeatmap
          model={signInHeatmap}
          loading={Boolean(ownerId) && ownerDocsLoading}
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Transaction activity"
          description="Tickets, water containers, and other refill units over the last 14 days"
        >
          {transactionsLoading ?
            <div className="flex h-[220px] items-center justify-center text-sm text-zinc-500">
              Loading transactions…
            </div>
          : <ResponsiveContainer width="100%" height={220}>
              <LineChart data={insights.transactionDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="transactions"
                  name="Transactions"
                  stroke="#64748b"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#64748b" }}
                />
                <Line
                  type="monotone"
                  dataKey="waterContainers"
                  name="Water containers"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#0d9488" }}
                />
                <Line
                  type="monotone"
                  dataKey="other"
                  name="Other"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#d97706" }}
                />
              </LineChart>
            </ResponsiveContainer>
          }
        </ChartCard>

        <ChartCard
          title="Order mix"
          description="Daily tickets by channel over the last 14 days"
        >
          {transactionsLoading ?
            <div className="flex h-[220px] items-center justify-center text-sm text-zinc-500">
              Loading transactions…
            </div>
          : <ResponsiveContainer width="100%" height={220}>
              <BarChart data={insights.mixDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="deliveryManual"
                  name="Delivery (manual)"
                  stackId="mix"
                  fill="#0d9488"
                />
                <Bar
                  dataKey="deliveryQr"
                  name="Delivery (QR)"
                  stackId="mix"
                  fill="#2563eb"
                />
                <Bar
                  dataKey="walkin"
                  name="Walk-in"
                  stackId="mix"
                  fill="#d97706"
                />
                <Bar
                  dataKey="direct"
                  name="Direct"
                  stackId="mix"
                  fill="#64748b"
                />
                <Bar
                  dataKey="collection"
                  name="Collection"
                  stackId="mix"
                  fill="#7c3aed"
                />
              </BarChart>
            </ResponsiveContainer>
          }
        </ChartCard>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Subscription consumption
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-900">
            {insights.planLabel}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            How much of the current plan limits this workspace has used
          </p>
        </div>

        {hasConsumption ?
          <div className="grid gap-3 lg:grid-cols-2">
            {insights.consumption.map((row) => (
              <ConsumptionRow
                key={row.id}
                label={row.label}
                used={row.used}
                cap={row.cap ?? 0}
                suffix={row.suffix}
              />
            ))}
          </div>
        : <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600 ring-1 ring-zinc-200/70">
            This plan has unlimited usage on the tracked limits, or no metered
            caps are configured.
          </p>
        }
      </div>
    </section>
  );
}
