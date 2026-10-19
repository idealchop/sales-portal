"use client";

import { useCallback, useMemo } from "react";
import { dedupeAssigneeRoster } from "@/features/lead-pipeline/lib/lead-assignees";
import { fetchLeadAssignees, type TeamMemberSummary } from "@/lib/sales/api";
import { usePromiseResource } from "@/hooks/use-promise-resource";

const EMPTY: TeamMemberSummary[] = [];

/** Sales Portal accounts that can be assigned to a lead. */
export function useLeadAssignees() {
  const load = useCallback(() => fetchLeadAssignees(), []);

  const { data, isLoading, isFetching, error, refresh } =
    usePromiseResource({
      load,
      initial: EMPTY,
      errorMessage: "Unable to load sales accounts.",
    });

  const members = useMemo(() => dedupeAssigneeRoster(data), [data]);

  return { members, isLoading, isFetching, error, refresh };
}
