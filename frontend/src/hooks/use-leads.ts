"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createLead,
  fetchLeads,
  fetchLeadsAnalytics,
  gatherLeads,
  updateLead,
  type GatherLeadsMode,
  type GatherLeadsSummary,
  type LeadListParams,
} from "@/lib/sales/api";
import type { Lead, LeadAnalytics } from "@/lib/definitions";

export function useLeads(
  params: LeadListParams & { enabled?: boolean } = {},
) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGathering, setIsGathering] = useState(false);
  const [gatherError, setGatherError] = useState<string | null>(null);
  const [gatherSummary, setGatherSummary] = useState<GatherLeadsSummary | null>(
    null,
  );
  const queue = params.queue ?? "warm";
  const stage = params.stage;
  const assignee = params.assignee;
  const q = params.q;
  const enabled = params.enabled !== false;
  const analyticsLoaded = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLeads([]);
      setAnalytics(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [leadData, analyticsData] = await Promise.all([
        fetchLeads({ queue, stage, assignee, q }),
        fetchLeadsAnalytics(),
      ]);
      setLeads(leadData);
      setAnalytics(analyticsData);
      analyticsLoaded.current = true;
    } catch {
      setError("Unable to load lead pipeline.");
      setLeads([]);
      setAnalytics(null);
      analyticsLoaded.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [queue, stage, assignee, q, enabled]);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setLeads([]);
      setAnalytics(null);
      setError(null);
      setIsLoading(false);
      analyticsLoaded.current = false;
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);

    const load = async () => {
      try {
        // Queue switches only need the filtered list; analytics (tab counts)
        // is loaded once and reused until a full refresh.
        if (analyticsLoaded.current) {
          const leadData = await fetchLeads({ queue, stage, assignee, q });
          if (cancelled) return;
          setLeads(leadData);
          setError(null);
          setIsLoading(false);
          return;
        }

        const [leadData, analyticsData] = await Promise.all([
          fetchLeads({ queue, stage, assignee, q }),
          fetchLeadsAnalytics(),
        ]);
        if (cancelled) return;
        setLeads(leadData);
        setAnalytics(analyticsData);
        analyticsLoaded.current = true;
        setError(null);
        setIsLoading(false);
      } catch {
        if (cancelled) return;
        setError("Unable to load lead pipeline.");
        setLeads([]);
        setAnalytics(null);
        analyticsLoaded.current = false;
        setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [queue, stage, assignee, q, enabled]);

  const saveLead = useCallback(
    async (
      input: Partial<Lead> & { bumpAttempt?: boolean },
      leadId?: string,
    ) => {
      if (leadId) {
        await updateLead(leadId, input);
      } else {
        await createLead(input);
      }
      analyticsLoaded.current = false;
      await refresh();
    },
    [refresh],
  );

  const gather = useCallback(
    async (mode: GatherLeadsMode) => {
      setIsGathering(true);
      setGatherError(null);
      setGatherSummary(null);
      try {
        const summary = await gatherLeads({ mode });
        setGatherSummary(summary);
        analyticsLoaded.current = false;
        await refresh();
        return summary;
      } catch {
        setGatherError("Unable to gather leads from SmartRefill & legacy.");
        return null;
      } finally {
        setIsGathering(false);
      }
    },
    [refresh],
  );

  return {
    leads,
    analytics,
    isLoading,
    error,
    refresh,
    saveLead,
    gather,
    isGathering,
    gatherError,
    gatherSummary,
  };
}
