import { describe, expect, it } from "vitest";
import { matchesSubcollectionFilter } from "@/lib/admin/firestore-document-list";
import { parseCustomerProfileStatus } from "@/lib/admin/customer-list-display";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";

function customerDoc(status: string): UserFirestoreDocumentRow {
  return {
    path: "businesses/b1/customers/c1",
    collectionId: "customers",
    documentId: "c1",
    label: "C1",
    isRoot: false,
    data: { status, name: "Test Customer" },
  };
}

describe("customer bulk status helpers", () => {
  it("maps inactive and archived profile statuses to inactive", () => {
    expect(parseCustomerProfileStatus({ status: "inactive" })).toBe("inactive");
    expect(parseCustomerProfileStatus({ status: "archived" })).toBe("inactive");
    expect(parseCustomerProfileStatus({ status: "active" })).toBe("active");
    expect(parseCustomerProfileStatus({})).toBe("active");
  });

  it("filters customers by active and deactivated status", () => {
    expect(
      matchesSubcollectionFilter(customerDoc("active"), "customers", "active"),
    ).toBe(true);
    expect(
      matchesSubcollectionFilter(
        customerDoc("inactive"),
        "customers",
        "inactive",
      ),
    ).toBe(true);
    expect(
      matchesSubcollectionFilter(customerDoc("active"), "customers", "inactive"),
    ).toBe(false);
  });
});
