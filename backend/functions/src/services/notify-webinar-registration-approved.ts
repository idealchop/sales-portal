import { logger } from "firebase-functions";
import { proxyToSmartrefillApi } from "./smartrefill-api-client";

export async function notifyRegistrationApprovedViaSmartrefill(
  idToken: string,
  registrationId: string,
): Promise<void> {
  const response = await proxyToSmartrefillApi(
    `/events-training/ops/registrations/${encodeURIComponent(registrationId)}/notify-approved`,
    {
      method: "POST",
      idToken,
      body: JSON.stringify({}),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.warn("notifyRegistrationApprovedViaSmartrefill failed", {
      status: response.status,
      body: body.slice(0, 200),
      registrationId,
    });
  }
}
