"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createLead,
  fetchLeads,
  fetchLeadsAnalytics,
  gatherLeads,
  updateLead,
  bulkAssignLeads,
  type BulkAssignMode,
  type GatherLeadsMode,
  type GatherLeadsSummary,
  type LeadListParams,
} from "@/lib/sales/api";
import {
  buildQueueCountsFromLeads,
  filterLeadsByPipelineParams,
} from "@/features/lead-pipeline/lib/lead-pipeline-list";
import type { Lead, LeadAnalytics } from "@/lib/definitions";

function mergeLeadAnalytics(
  previous: LeadAnalytics | null,
  allLeads: Lead[],
): LeadAnalytics | null {
  const queueCounts = buildQueueCountsFromLeads(allLeads);
  if (!previous) {
    return {
      funnel: [],
      bySource: [],
      byAssignee: [],
      queueCounts,
      trialRisk: { daysLeftZero: 0, daysLeftLte3: 0 },
      stallReasons: [],
    };
  }
  return { ...previous, queueCounts };
}

/**
 * Lead pipeline data hook.
 *
 * - Loads the full list once (plus analytics), then filters queue/assignee locally.
 * - Mutations apply the PATCH/POST Promise result immediately — no full-page loading.
 * - Background refetch never blanks the UI (`isLoading` is first paint only).
 */
export function useLeads(
  params: LeadListParams & { enabled?: boolean } = {},
) {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGathering, setIsGathering] = useState(false);
  const [gatherError, setGatherError] = useState<string | null>(null);
  const [gatherSummary, setGatherSummary] = useState<GatherLeadsSummary | null>(
    null,
  );

  const queue = params.queue ?? "all";
  const assignee = params.assignee;
  const enabled = params.enabled !== false;
  const hasLoadedRef = useRef(false);
  const allLeadsRef = useRef<Lead[]>([]);
  const requestIdRef = useRef(0);

  const applyAllLeads = useCallback((next: Lead[]) => {
    allLeadsRef.current = next;
    setAllLeads(next);
    setAnalytics((current) => mergeLeadAnalytics(current, next));
  }, []);

  const leads = useMemo(
    () =>
      filterLeadsByPipelineParams(allLeads, {
        queue,
        assignee,
      }),
    [allLeads, queue, assignee],
  );

  const loadFromServer = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!enabled) {
        allLeadsRef.current = [];
        setAllLeads([]);
        setAnalytics(null);
        setIsLoading(false);
        setIsFetching(false);
        hasLoadedRef.current = false;
        return;
      }

      const requestId = ++requestIdRef.current;
      const silent = options?.silent === true && hasLoadedRef.current;

      if (!hasLoadedRef.current && !silent) {
        setIsLoading(true);
      } else {
        setIsFetching(true);
      }
      setError(null);

      try {
        const [leadData, analyticsData] = await Promise.all([
          // Always fetch the full collection once; queue/assignee filter locally.
          fetchLeads({ queue: "all" }),
          fetchLeadsAnalytics(),
        ]);
        if (requestId !== requestIdRef.current) return;

        startTransition(() => {
          allLeadsRef.current = leadData;
          setAllLeads(leadData);
          setAnalytics(analyticsData);
          setError(null);
        });
        hasLoadedRef.current = true;
      } catch {
        if (requestId !== requestIdRef.current) return;
        setError("Unable to load lead pipeline.");
        if (!hasLoadedRef.current) {
          allLeadsRef.current = [];
          setAllLeads([]);
          setAnalytics(null);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    void loadFromServer();
  }, [loadFromServer]);

  const refresh = useCallback(async () => {
    await loadFromServer({ silent: true });
  }, [loadFromServer]);

  const saveLead = useCallback(
    async (
      input: Partial<Lead> & { bumpAttempt?: boolean },
      leadId?: string,
    ) => {
      if (leadId) {
        const updated = await updateLead(leadId, input);
        // Apply the resolved Promise body immediately — no loading blank.
        const next = allLeadsRef.current.map((lead) =>
          lead.id === updated.id ? updated : lead,
        );
        startTransition(() => {
          applyAllLeads(next);
        });
        return updated;
      }

      const created = await createLead(input);
      const next = [
        created,
        ...allLeadsRef.current.filter((lead) => lead.id !== created.id),
      ];
      startTransition(() => {
        applyAllLeads(next);
      });
      return created;
    },
    [applyAllLeads],
  );

  const gather = useCallback(
    async (mode: GatherLeadsMode) => {
      setIsGathering(true);
      setGatherError(null);
      setGatherSummary(null);
      try {
        const summary = await gatherLeads({ mode });
        setGatherSummary(summary);
        // Silent refresh — keep current rows visible while the new list loads.
        await loadFromServer({ silent: true });
        return summary;
      } catch {
        setGatherError("Unable to gather leads from SmartRefill & legacy.");
        return null;
      } finally {
        setIsGathering(false);
      }
    },
    [loadFromServer],
  );

  const bulkAssign = useCallback(
    async (input: {
      leadIds: string[];
      mode: BulkAssignMode;
      assignedToUids?: string[];
    }) => {
      const result = await bulkAssignLeads(input);
      if (result.updated.length > 0) {
        const byId = new Map(result.updated.map((lead) => [lead.id, lead]));
        const next = allLeadsRef.current.map(
          (lead) => byId.get(lead.id) ?? lead,
        );
        startTransition(() => {
          applyAllLeads(next);
        });
      }
      return result;
    },
    [applyAllLeads],
  );

  return {
    leads,
    allLeads,
    analytics,
    isLoading,
    isFetching,
    error,
    refresh,
    saveLead,
    bulkAssign,
    gather,
    isGathering,
    gatherError,
    gatherSummary,
  };
}
