import { apiClient } from "@/lib/api-client";
import type {
  PlatformAlert,
  PlatformAlertContactStatus,
  PlatformAlertKind,
} from "@/lib/dashboard/analytics";

export type PlatformAlertOutreachKind =
  | "new_user_registration"
  | "demo_inquiry"
  | "generic";

function outreachKindForAlert(
  kind: PlatformAlertKind,
): PlatformAlertOutreachKind {
  if (kind === "new_user_registration" || kind === "demo_inquiry") {
    return kind;
  }
  return "generic";
}

export async function updatePlatformAlertContactStatus(
  alertId: string,
  status: PlatformAlertContactStatus,
  outreach?: {
    toEmail: string;
    kind: PlatformAlertOutreachKind;
    recipientName?: string;
    businessName?: string;
    subtitle?: string;
  },
): Promise<{
  alertId: string;
  status: PlatformAlertContactStatus;
  outreach?: {
    sent: boolean;
    skipped: boolean;
    messageId?: string;
    subject: string;
  };
}> {
  const json = await apiClient.patch<{
    data: {
      alertId: string;
      status: PlatformAlertContactStatus;
      outreach?: {
        sent: boolean;
        skipped: boolean;
        messageId?: string;
        subject: string;
      };
    };
  }>(`/dashboard/platform-alerts/${encodeURIComponent(alertId)}/contact`, {
    status,
    ...(outreach ?? {}),
  });
  return json.data;
}

/** Contact via Brevo — marks alert contacted after send. */
export async function contactPlatformAlert(
  item: PlatformAlert,
): Promise<void> {
  if (!item.email?.trim()) {
    throw new Error("This alert has no email address.");
  }
  await updatePlatformAlertContactStatus(item.id, "contacted", {
    toEmail: item.email.trim(),
    kind: outreachKindForAlert(item.kind),
    recipientName: item.title,
    businessName: item.businessName,
    subtitle: item.subtitle,
  });
}
