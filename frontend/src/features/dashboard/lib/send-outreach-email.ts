import { apiClient } from "@/lib/api-client";

export type OutreachSendKind =
  | "new_user_registration"
  | "demo_inquiry"
  | "inactive_owner"
  | "generic";

export async function sendOutreachEmail(input: {
  toEmail: string;
  kind?: OutreachSendKind;
  recipientName?: string;
  businessName?: string;
  subtitle?: string;
}): Promise<{
  outreach: {
    sent: boolean;
    skipped: boolean;
    messageId?: string;
    subject: string;
  };
}> {
  const json = await apiClient.post<{
    data: {
      outreach: {
        sent: boolean;
        skipped: boolean;
        messageId?: string;
        subject: string;
      };
    };
  }>("/dashboard/outreach/send", {
    toEmail: input.toEmail,
    kind: input.kind ?? "generic",
    recipientName: input.recipientName,
    businessName: input.businessName,
    subtitle: input.subtitle,
  });
  return json.data;
}
