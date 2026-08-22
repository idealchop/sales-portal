import { describe, expect, it } from "vitest";
import {
  appLabelForId,
  extractActiveApps,
  userDocToDirectoryEntry,
} from "../../../services/clients-service";

describe("clients-service app categorization", () => {
  it("labels known and unknown apps", () => {
    expect(appLabelForId("smartrefill")).toBe("Smart Refill");
    expect(appLabelForId("sales-portal")).toBe("Sales Portal");
    expect(appLabelForId("fleet-ops")).toBe("Fleet Ops");
  });

  it("extracts active apps and skips revoked entries", () => {
    const apps = extractActiveApps([
      { appId: "smartrefill", role: "owner" },
      { appId: "sales-portal", role: "sales", accessRevoked: true },
      { appId: "smartrefill", role: "staff" },
      { appId: "", role: "owner" },
      null,
    ]);

    expect(apps).toEqual([
      { appId: "smartrefill", role: "owner", label: "Smart Refill" },
    ]);
  });

  it("maps a user document into a directory entry", () => {
    const entry = userDocToDirectoryEntry(
      "uid-1",
      {
        displayName: "Ana Owner",
        email: "ana@example.com",
        phone: "0917",
        companyName: "Ana WRS",
        appAccess: [
          { appId: "smartrefill", role: "owner" },
          { appId: "sales-portal", role: "sales" },
        ],
      },
      { id: "client-9", status: "pending" },
    );

    expect(entry).toMatchObject({
      linkedUserId: "uid-1",
      displayName: "Ana Owner",
      email: "ana@example.com",
      phone: "0917",
      companyName: "Ana WRS",
      clientId: "client-9",
      clientStatus: "pending",
      appIds: ["sales-portal", "smartrefill"],
    });
    expect(entry?.apps.map((app) => app.appId).sort()).toEqual([
      "sales-portal",
      "smartrefill",
    ]);
  });

  it("returns null when the user has no active apps", () => {
    expect(
      userDocToDirectoryEntry("uid-2", {
        displayName: "No Apps",
        appAccess: [{ appId: "smartrefill", accessRevoked: true }],
      }),
    ).toBeNull();
  });
});
