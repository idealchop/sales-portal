import { describe, expect, it } from "vitest";
import {
  countTrainingVideosByStatus,
  filterTrainingVideos,
  trainingVideoSearchText,
  uniqueTrainingVideoAppIds,
} from "@/features/events-training/lib/filter-training-videos";
import type { TrainingVideoRecord } from "@/features/events-training/lib/events-training-types";

function video(
  partial: Partial<TrainingVideoRecord> & Pick<TrainingVideoRecord, "id" | "name">,
): TrainingVideoRecord {
  return {
    description: "",
    recordedAt: null,
    status: "draft",
    category: "tutorial",
    subcategory: null,
    appId: "smartrefill",
    appPages: ["dashboard"],
    webinarEventId: null,
    playbackProvider: "loom",
    playbackUrl: "https://www.loom.com/share/abc",
    playbackId: "abc",
    thumbnailUrl: null,
    featured: false,
    sortOrder: 0,
    visibility: "public",
    priceCents: 0,
    currency: "PHP",
    allowedPlanCodes: [],
    allowAllMembers: false,
    certificationEnabled: false,
    archivedAt: null,
    tags: [],
    ...partial,
  };
}

describe("filterTrainingVideos", () => {
  const items = [
    video({
      id: "1",
      name: "Dashboard intro",
      status: "published",
      appPages: ["dashboard"],
      tags: ["start"],
    }),
    video({
      id: "2",
      name: "Customers walkthrough",
      status: "draft",
      appPages: ["customers"],
      playbackProvider: "youtube",
      playbackUrl: "https://youtube.com/watch?v=1",
    }),
    video({
      id: "3",
      name: "Archive note",
      status: "archived",
      appId: "other-app",
    }),
  ];

  it("filters by search across title, pages, and tags", () => {
    expect(
      filterTrainingVideos(items, {
        search: "customers",
        status: "all",
        appId: "all",
        provider: "all",
      }).map((row) => row.id),
    ).toEqual(["2"]);
    expect(
      filterTrainingVideos(items, {
        search: "start",
        status: "all",
        appId: "all",
        provider: "all",
      }).map((row) => row.id),
    ).toEqual(["1"]);
  });

  it("filters by status, app, and provider", () => {
    expect(
      filterTrainingVideos(items, {
        search: "",
        status: "draft",
        appId: "all",
        provider: "all",
      }).map((row) => row.id),
    ).toEqual(["2"]);
    expect(
      filterTrainingVideos(items, {
        search: "",
        status: "all",
        appId: "other-app",
        provider: "all",
      }).map((row) => row.id),
    ).toEqual(["3"]);
    expect(
      filterTrainingVideos(items, {
        search: "",
        status: "all",
        appId: "all",
        provider: "youtube",
      }).map((row) => row.id),
    ).toEqual(["2"]);
  });

  it("counts statuses and unique apps", () => {
    expect(countTrainingVideosByStatus(items)).toEqual({
      all: 3,
      draft: 1,
      published: 1,
      archived: 1,
    });
    expect(uniqueTrainingVideoAppIds(items)).toEqual(["other-app", "smartrefill"]);
    expect(trainingVideoSearchText(items[0]!)).toContain("dashboard intro");
  });
});
