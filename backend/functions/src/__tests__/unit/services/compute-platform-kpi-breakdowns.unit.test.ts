import { describe, expect, it } from "vitest";
import {
  aggregatePlatformInventory,
  classifyBusinessTier,
  countVirtualStaffRecords,
  resolveInventoryItemRole,
  sumInventoryBreakdown,
  sumTransactionBreakdown,
} from "../../../services/compute-platform-kpi-breakdowns";

describe("classifyBusinessTier", () => {
  it("maps paid active subscriptions to scale, grow, or starter", () => {
    expect(
      classifyBusinessTier("Scale Plan", "scale", "active", { price: 2499 }),
    ).toBe("scale");
    expect(
      classifyBusinessTier("Growth", "growth", "active", { price: 1499 }),
    ).toBe("grow");
    expect(
      classifyBusinessTier("Starter", "starter", "active", { price: 499 }),
    ).toBe("starter");
  });

  it("treats free trial, zero-price, and free starter as free — not Scale/Grow wins", () => {
    expect(
      classifyBusinessTier("Scale", "scale", "active", {
        billingCycle: "trial",
        price: 0,
      }),
    ).toBe("free");
    expect(
      classifyBusinessTier("Scale Plan", "scale", "active", { price: 0 }),
    ).toBe("free");
    expect(
      classifyBusinessTier("Starter", "starter", "active", { price: 0 }),
    ).toBe("free");
    expect(classifyBusinessTier("Free tier", "free", "active", { price: 0 })).toBe(
      "free",
    );
    expect(classifyBusinessTier(undefined, undefined, "cancelled")).toBe("free");
  });
});

describe("countVirtualStaffRecords", () => {
  it("counts rider subcollection records without linked user accounts", () => {
    const businessById = new Map([
      ["biz-1", { ownerId: "owner-1" }],
    ]);
    const usersById = new Set(["owner-1", "staff-linked"]);

    const ridersSnap = {
      docs: [
        {
          id: "owner-1",
          ref: { parent: { parent: { id: "biz-1" } } },
          data: () => ({ role: "owner" }),
        },
        {
          id: "staff-linked",
          ref: { parent: { parent: { id: "biz-1" } } },
          data: () => ({ role: "rider", userId: "staff-linked" }),
        },
        {
          id: "BPLJjay3YU3IGgJ98KF3",
          ref: { parent: { parent: { id: "biz-1" } } },
          data: () => ({
            role: "staff",
            staffSubRole: "admin",
            displayName: "Desk Admin",
          }),
        },
        {
          id: "virtual-rider",
          ref: { parent: { parent: { id: "biz-1" } } },
          data: () => ({ displayName: "Rider One", vehicle: "Motorcycle" }),
        },
      ],
    } as unknown as FirebaseFirestore.QuerySnapshot;

    expect(
      countVirtualStaffRecords(ridersSnap, businessById, usersById),
    ).toEqual({ admins: 1, riders: 1 });
  });
});

describe("resolveInventoryItemRole", () => {
  it("maps explicit roles and legacy container names", () => {
    expect(resolveInventoryItemRole("Payatot", "container_slim")).toBe("container_slim");
    expect(resolveInventoryItemRole("Round Ngani", "container_round")).toBe("container_round");
    expect(resolveInventoryItemRole("WRS Shell", "container_shell")).toBe("container_shell");
    expect(resolveInventoryItemRole("caps", "kit_component")).toBe("kit_component");
    expect(resolveInventoryItemRole("Ice", undefined)).toBe("general");
    expect(resolveInventoryItemRole("5-gallon Slim", undefined)).toBe("container_slim");
    expect(resolveInventoryItemRole("5-gallon Round", undefined)).toBe("container_round");
    expect(resolveInventoryItemRole("5 Gallon Jug", undefined)).toBe("container_shell");
  });
});

describe("aggregatePlatformInventory", () => {
  it("totals stock by general, kit, and container shape", () => {
    const inventorySnap = {
      docs: [
        {
          id: "general-1",
          data: () => ({ name: "Ice", inventoryRole: "general", stock: { current: 36 } }),
        },
        {
          id: "kit-1",
          data: () => ({ name: "caps", inventoryRole: "kit_component", stock: { current: 120 } }),
        },
        {
          id: "shell-1",
          data: () => ({ name: "WRS Shell", inventoryRole: "container_shell", stock: { current: 50 } }),
        },
        {
          id: "round-1",
          data: () => ({ name: "Round Ngani", inventoryRole: "container_round", stock: { current: 99 } }),
        },
        {
          id: "slim-1",
          data: () => ({ name: "Payatot", inventoryRole: "container_slim", stock: { current: 1000 } }),
        },
        {
          id: "empty-1",
          data: () => ({ name: "Empty", inventoryRole: "general", stock: { current: 0 } }),
        },
      ],
    } as unknown as FirebaseFirestore.QuerySnapshot;

    const breakdown = aggregatePlatformInventory(inventorySnap);
    expect(breakdown).toEqual({
      generalStock: 36,
      kit: 120,
      container: { shell: 50, round: 99, slim: 1000 },
    });
    expect(sumInventoryBreakdown(breakdown)).toBe(1305);
  });
});

describe("sumTransactionBreakdown", () => {
  it("totals walk-in, direct sale, and order counts", () => {
    expect(
      sumTransactionBreakdown({ walkIn: 10, directSale: 5, orders: 7 }),
    ).toBe(22);
  });
});
