import { describe, expect, it } from "vitest";
import {
  mergeOwnersPreservingContact,
  shouldShowInactiveOwnerContactButton,
} from "@/features/dashboard/lib/inactive-owner-contact";

describe("shouldShowInactiveOwnerContactButton", () => {
  const now = new Date("2026-07-23T12:00:00.000Z");

  it("hides when no email", () => {
    expect(
      shouldShowInactiveOwnerContactButton({ ownerEmail: undefined }, now),
    ).toBe(false);
  });

  it("shows when never contacted", () => {
    expect(
      shouldShowInactiveOwnerContactButton(
        { ownerEmail: "a@example.com", lastContactedAt: null },
        now,
      ),
    ).toBe(true);
  });

  it("hides within 7 days of contact", () => {
    expect(
      shouldShowInactiveOwnerContactButton(
        {
          ownerEmail: "a@example.com",
          lastContactedAt: "2026-07-20T12:00:00.000Z",
        },
        now,
      ),
    ).toBe(false);
  });

  it("shows again after 7 days", () => {
    expect(
      shouldShowInactiveOwnerContactButton(
        {
          ownerEmail: "a@example.com",
          lastContactedAt: "2026-07-16T11:00:00.000Z",
        },
        now,
      ),
    ).toBe(true);
  });
});

describe("mergeOwnersPreservingContact", () => {
  it("keeps newer local lastContactedAt when refresh is stale", () => {
    const merged = mergeOwnersPreservingContact(
      [
        {
          id: "biz-1",
          lastContactedAt: null,
        },
      ],
      [
        {
          id: "biz-1",
          lastContactedAt: "2026-07-23T12:00:00.000Z",
        },
      ],
    );
    expect(merged[0]?.lastContactedAt).toBe("2026-07-23T12:00:00.000Z");
  });
});
