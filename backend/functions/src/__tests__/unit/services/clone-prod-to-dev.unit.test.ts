import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../config/dev-tier", () => ({
  resolveFirestoreDatabaseId: vi.fn(() => "riverdb"),
}));

vi.mock("../../../config/firebase-admin", () => ({
  FieldValue: { serverTimestamp: vi.fn(() => "ts") },
  app: {},
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn(),
}));

vi.mock("@google-cloud/firestore", () => ({
  v1: {
    FirestoreAdminClient: vi.fn(),
  },
}));

import { resolveFirestoreDatabaseId } from "../../../config/dev-tier";
import {
  assertCloneProdToDevConfirm,
  assertCloneRunsOnProdApi,
  CLONE_PROD_TO_DEV_CONFIRM_PHRASE,
} from "../../../services/clone-prod-to-dev-service";

describe("clone-prod-to-dev-service guards", () => {
  beforeEach(() => {
    vi.mocked(resolveFirestoreDatabaseId).mockReturnValue("riverdb");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requires the exact confirm phrase", () => {
    expect(() => assertCloneProdToDevConfirm("wrong")).toThrow(
      "CONFIRM_PHRASE_REQUIRED",
    );
    expect(() =>
      assertCloneProdToDevConfirm(CLONE_PROD_TO_DEV_CONFIRM_PHRASE),
    ).not.toThrow();
  });

  it("only allows Prod API (riverdb)", () => {
    expect(() => assertCloneRunsOnProdApi()).not.toThrow();
    vi.mocked(resolveFirestoreDatabaseId).mockReturnValue("riverdb-dev");
    expect(() => assertCloneRunsOnProdApi()).toThrow("MUST_RUN_ON_PROD_API");
  });
});
