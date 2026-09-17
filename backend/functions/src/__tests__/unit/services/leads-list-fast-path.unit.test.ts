import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCollectionGet = vi.hoisted(() => vi.fn());
const mockBuildBundle = vi.hoisted(() => vi.fn());

vi.mock("../../../config/firebase-admin", () => ({
  FieldValue: {
    serverTimestamp: () => "SERVER_TS",
  },
  db: {
    collection: (name: string) => {
      if (name !== "leads") throw new Error(`unexpected collection ${name}`);
      return {
        get: mockCollectionGet,
        doc: (id: string) => ({ id, get: vi.fn() }),
      };
    },
  },
}));

vi.mock("../../../services/build-smartrefill-pipeline-leads", () => ({
  buildSmartRefillPipelineBundle: (...args: unknown[]) => mockBuildBundle(...args),
  excludeSalesConnectedLeads: (leads: unknown[]) => leads,
}));

vi.mock("../../../services/sales-scope", () => ({
  resolveAccessibleUserIds: vi.fn(async () => "all"),
  canAccessOwner: vi.fn(() => true),
}));

import { listLeads } from "../../../services/leads-service";

describe("listLeads fast path", () => {
  beforeEach(() => {
    mockCollectionGet.mockReset();
    mockBuildBundle.mockReset();
  });

  it("reads leads collection only and does not call pipeline builder", async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [
        {
          id: "sr-business:b1",
          data: () => ({
            userId: "smartrefill",
            businessName: "Aqua",
            ownerName: "Jane",
            stage: "warm",
            pipelineGathered: true,
            channels: {},
          }),
        },
      ],
    });

    const rows = await listLeads(
      { uid: "sales-1", role: "sales" },
      { queue: "warm" },
    );

    expect(mockBuildBundle).not.toHaveBeenCalled();
    expect(mockCollectionGet).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("sr-business:b1");
    expect(rows[0]?.pipelineGathered).toBe(true);
  });
});
