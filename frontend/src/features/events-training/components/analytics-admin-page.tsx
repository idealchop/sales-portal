"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSalesProfile } from "@/hooks/use-sales-profile";
import { fetchEventsTrainingAnalytics } from "../lib/events-training-api";
import type { EventsTrainingAnalyticsSummary } from "../lib/events-training-types";
import { inputClassName, labelClassName } from "../lib/form-styles";
import { EventsTrainingAnalyticsPanel } from "./events-training-analytics-panel";

export function AnalyticsAdminPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useSalesProfile();
  const [periodDays, setPeriodDays] = useState(30);
  const [data, setData] = useState<EventsTrainingAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchEventsTrainingAnalytics(periodDays));
    } catch {
      setError("Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [periodDays]);

  useEffect(() => {
    if (profileLoading) return;
    if (profile?.role !== "admin" && profile?.role !== "manager") {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [load, profile?.role, profileLoading, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Analytics</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Registrations, engagement, revenue, and catalog breakdowns.
          </p>
        </div>
        <div>
          <label className={labelClassName} htmlFor="period">
            Period
          </label>
          <select
            id="period"
            className={inputClassName}
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <EventsTrainingAnalyticsPanel data={data} loading={loading} />
    </div>
  );
}
