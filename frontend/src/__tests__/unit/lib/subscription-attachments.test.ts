import { describe, expect, it } from "vitest";
import {
  classifyAttachmentUrl,
  getSubscriptionAttachments,
} from "@/lib/dashboard/subscription-attachments";
import type { OwnerSubscription } from "@/lib/dashboard/analytics";

const baseSubscription: OwnerSubscription = {
  id: "sub-1",
  planName: "Scale",
  status: "active",
  price: 1650,
  timeline: "current",
  cancelAtPeriodEnd: false,
  needsApproval: true,
  isDowngrade: false,
  isCancellation: false,
};

describe("subscription-attachments", () => {
  it("classifies image, pdf, and generic file URLs", () => {
    expect(classifyAttachmentUrl("https://example.com/receipt.png")).toBe("image");
    expect(classifyAttachmentUrl("data:image/jpeg;base64,abc")).toBe("image");
    expect(classifyAttachmentUrl("https://example.com/proof.pdf")).toBe("pdf");
    expect(classifyAttachmentUrl("https://example.com/file.bin")).toBe("file");
  });

  it("collects receipt and attachment URLs without duplicates", () => {
    const attachments = getSubscriptionAttachments({
      ...baseSubscription,
      receiptUrl: "https://example.com/receipt.jpg",
      attachmentUrl: "https://example.com/receipt.jpg",
    });

    expect(attachments).toHaveLength(1);
    expect(attachments[0]?.label).toBe("Payment receipt");
  });
});
