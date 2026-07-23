import type { PlatformAlert } from "@/lib/dashboard/analytics";
import { buildDemoInquiryMailto } from "@/lib/email/demo-inquiry-template";
import { buildNewUserWelcomeMailto } from "@/lib/email/new-user-welcome-template";

/** Mailto for alert kinds that have outreach templates; otherwise null. */
export function buildPlatformAlertOutreachMailto(
  item: PlatformAlert,
): string | null {
  if (!item.email) return null;

  if (item.kind === "new_user_registration") {
    return buildNewUserWelcomeMailto(item.email, {
      recipientName: item.title,
      businessName: item.businessName,
    });
  }

  if (item.kind === "demo_inquiry") {
    return buildDemoInquiryMailto(item.email, {
      recipientName: item.title,
      businessName: item.businessName,
    });
  }

  return null;
}

/** Opens the outreach compose window when a template exists. */
export function openPlatformAlertOutreachEmail(item: PlatformAlert): void {
  const href = buildPlatformAlertOutreachMailto(item);
  if (!href || typeof window === "undefined") return;
  window.location.href = href;
}
