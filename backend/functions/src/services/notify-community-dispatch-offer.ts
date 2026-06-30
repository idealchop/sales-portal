import { logger } from "firebase-functions";
import { proxyToSmartrefillApi } from "./smartrefill-api-client";

export async function notifyCommunityDispatchOfferViaSmartrefill(
  idToken: string,
  payload: { offerId: string; requestId: string; businessId: string },
): Promise<void> {
  const response = await proxyToSmartrefillApi("/business/community-dispatch/ops/notify-offer", {
    method: "POST",
    idToken,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.warn("notifyCommunityDispatchOfferViaSmartrefill failed", {
      status: response.status,
      body: body.slice(0, 200),
      offerId: payload.offerId,
    });
  }
}
