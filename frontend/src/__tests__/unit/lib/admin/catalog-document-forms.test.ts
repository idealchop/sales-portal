import { describe, expect, it } from "vitest";
import {
  catalogDocumentPayloadFromForm,
  catalogFormValuesFromDocument,
  emptyCatalogFormValues,
} from "@/lib/admin/catalog-document-forms";

describe("product icon catalog form", () => {
  it("defaults waterContainer to false on a new icon", () => {
    const form = emptyCatalogFormValues("product_icons");
    expect(form.collectionId).toBe("product_icons");
    expect(form.values.waterContainer).toBe(false);
  });

  it("reads waterContainer from Firestore and writes it back", () => {
    const form = catalogFormValuesFromDocument("product_icons", "1liter-bottle", {
      name: "1 Liter Bottle",
      imageUrl: "https://example.com/1l.svg",
      lucide: "Droplets",
      sortOrder: 10,
      active: true,
      waterContainer: true,
    });
    expect(form.collectionId).toBe("product_icons");
    expect(form.values.waterContainer).toBe(true);

    const payload = catalogDocumentPayloadFromForm(form);
    expect(payload.waterContainer).toBe(true);
    expect(payload.name).toBe("1 Liter Bottle");
  });

  it("treats missing waterContainer as false", () => {
    const form = catalogFormValuesFromDocument("product_icons", "droplets", {
      name: "Water",
      lucide: "Droplets",
      active: true,
    });
    expect(form.collectionId).toBe("product_icons");
    expect(form.values.waterContainer).toBe(false);

    const payload = catalogDocumentPayloadFromForm(form);
    expect(payload.waterContainer).toBe(false);
  });
});
