import { describe, expect, it } from "vitest";

/**
 * Pure merge helper mirrored from listSalesPortalAccounts intent —
 * sales-portal appAccess users must appear even without sales/{uid}.
 */
function mergeAssigneeCandidates(input: {
  portalUsers: Array<{
    id: string;
    displayName?: string;
    email?: string;
    role?: string;
  }>;
  salesDocs: Array<{
    id: string;
    displayName?: string;
    email?: string;
    role?: string;
  }>;
  actorUid: string;
}) {
  const byId = new Map<
    string,
    { id: string; displayName: string; email?: string; role?: string }
  >();

  for (const user of input.portalUsers) {
    byId.set(user.id, {
      id: user.id,
      displayName: user.displayName || user.email || "Sales account",
      email: user.email,
      role: user.role,
    });
  }
  for (const doc of input.salesDocs) {
    const existing = byId.get(doc.id);
    byId.set(doc.id, {
      id: doc.id,
      displayName:
        doc.displayName || existing?.displayName || "Unknown",
      email: doc.email || existing?.email,
      role: doc.role || existing?.role,
    });
  }
  if (!byId.has(input.actorUid)) {
    byId.set(input.actorUid, {
      id: input.actorUid,
      displayName: "You",
      role: "admin",
    });
  }
  return [...byId.values()];
}

describe("lead assignees roster", () => {
  it("includes Sales Portal admins from users.appAccess even without sales/{uid}", () => {
    const members = mergeAssigneeCandidates({
      portalUsers: [
        {
          id: "kbiLAdu81EXYR0qbBobduBSma6i2",
          displayName: "Justfer (RB Dev)",
          email: "justfer@riverph.com",
          role: "admin",
        },
      ],
      salesDocs: [
        {
          id: "sales-rep-1",
          displayName: "Rep One",
          role: "sales",
        },
      ],
      actorUid: "kbiLAdu81EXYR0qbBobduBSma6i2",
    });

    expect(members.map((row) => row.id).sort()).toEqual([
      "kbiLAdu81EXYR0qbBobduBSma6i2",
      "sales-rep-1",
    ]);
    expect(
      members.find((row) => row.id === "kbiLAdu81EXYR0qbBobduBSma6i2")
        ?.displayName,
    ).toBe("Justfer (RB Dev)");
  });
});
