import { apiClient } from "@/lib/api-client";

export async function recordInactiveOwnerContact(input: {
  businessId: string;
  toEmail: string;
  businessName?: string;
  recipientName?: string;
}): Promise<{
  businessId: string;
  contactedAt: string;
  outreach?: {
    sent: boolean;
    skipped: boolean;
    messageId?: string;
    subject: string;
  };
}> {
  const json = await apiClient.patch<{
    data: {
      businessId: string;
      contactedAt: string;
      outreach?: {
        sent: boolean;
        skipped: boolean;
        messageId?: string;
        subject: string;
      };
    };
  }>(
    `/dashboard/inactive-owners/${encodeURIComponent(input.businessId)}/contact`,
    {
      toEmail: input.toEmail,
      businessName: input.businessName,
      recipientName: input.recipientName,
    },
  );
  return json.data;
}
