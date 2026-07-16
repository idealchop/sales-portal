import type {
  PlaybackProvider,
  TrainingVideoRecord,
  VideoStatus,
} from "./events-training-types";
import { tutorialPageLabel, tutorialTargetAppLabel } from "./events-training-types";

export const TRAINING_VIDEO_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export type TrainingVideoPageSize = (typeof TRAINING_VIDEO_PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_TRAINING_VIDEO_PAGE_SIZE: TrainingVideoPageSize = 10;

export type TrainingVideoStatusFilter = "all" | VideoStatus;
export type TrainingVideoAppFilter = "all" | string;
export type TrainingVideoProviderFilter = "all" | PlaybackProvider;

export type TrainingVideoListFilters = {
  search: string;
  status: TrainingVideoStatusFilter;
  appId: TrainingVideoAppFilter;
  provider: TrainingVideoProviderFilter;
};

export function trainingVideoSearchText(item: TrainingVideoRecord): string {
  const pages = (item.appPages ?? []).map(tutorialPageLabel).join(" ");
  const tags = (item.tags ?? []).join(" ");
  return [
    item.name,
    item.description,
    item.playbackUrl,
    item.playbackProvider,
    item.status,
    item.appId ? tutorialTargetAppLabel(item.appId) : "",
    item.appId ?? "",
    pages,
    tags,
  ]
    .join(" ")
    .toLowerCase();
}

export function filterTrainingVideos(
  items: TrainingVideoRecord[],
  filters: TrainingVideoListFilters,
): TrainingVideoRecord[] {
  const query = filters.search.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.appId !== "all" && item.appId !== filters.appId) return false;
    if (
      filters.provider !== "all" &&
      item.playbackProvider !== filters.provider
    ) {
      return false;
    }
    if (query && !trainingVideoSearchText(item).includes(query)) return false;
    return true;
  });
}

export function countTrainingVideosByStatus(
  items: TrainingVideoRecord[],
): Record<TrainingVideoStatusFilter, number> {
  const counts: Record<TrainingVideoStatusFilter, number> = {
    all: items.length,
    draft: 0,
    published: 0,
    archived: 0,
  };
  for (const item of items) {
    counts[item.status] += 1;
  }
  return counts;
}

export function uniqueTrainingVideoAppIds(
  items: TrainingVideoRecord[],
): string[] {
  return [
    ...new Set(
      items
        .map((item) => item.appId?.trim())
        .filter((appId): appId is string => Boolean(appId)),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function uniqueTrainingVideoProviders(
  items: TrainingVideoRecord[],
): PlaybackProvider[] {
  return [
    ...new Set(items.map((item) => item.playbackProvider)),
  ].sort((a, b) => a.localeCompare(b)) as PlaybackProvider[];
}
