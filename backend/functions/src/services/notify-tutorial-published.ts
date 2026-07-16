import { logger } from "firebase-functions";
import { proxyToSmartrefillApi } from "./smartrefill-api-client";

export async function notifyTutorialPublishedViaSmartrefill(
  idToken: string,
  payload: {
    videoId: string;
    name: string;
    appId?: string | null;
    appPages?: string[] | null;
  },
): Promise<void> {
  const response = await proxyToSmartrefillApi(
    "/events-training/ops/notify-tutorial-published",
    {
      method: "POST",
      idToken,
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.warn("notifyTutorialPublishedViaSmartrefill failed", {
      status: response.status,
      body: body.slice(0, 200),
      videoId: payload.videoId,
    });
  }
}
