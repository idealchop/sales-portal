import { logger } from "firebase-functions";
import { proxyToSmartrefillApi } from "./smartrefill-api-client";

export async function notifyWebinarPublishedViaSmartrefill(
  idToken: string,
  payload: { eventId: string; name: string; startsAt?: string | null },
): Promise<void> {
  const response = await proxyToSmartrefillApi(
    "/events-training/ops/notify-webinar-published",
    {
      method: "POST",
      idToken,
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.warn("notifyWebinarPublishedViaSmartrefill failed", {
      status: response.status,
      body: body.slice(0, 200),
      eventId: payload.eventId,
    });
  }
}
