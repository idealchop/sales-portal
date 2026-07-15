import { logger } from "firebase-functions";
import { proxyToSmartrefillApi } from "./smartrefill-api-client";

export async function notifyResourcesVideoPublishedViaSmartrefill(
  idToken: string,
  payload: {
    videoId: string;
    name: string;
    category: "wrs_stories" | "webinar";
  },
): Promise<void> {
  const response = await proxyToSmartrefillApi(
    "/events-training/ops/notify-resources-video-published",
    {
      method: "POST",
      idToken,
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.warn("notifyResourcesVideoPublishedViaSmartrefill failed", {
      status: response.status,
      body: body.slice(0, 200),
      videoId: payload.videoId,
      category: payload.category,
    });
  }
}
