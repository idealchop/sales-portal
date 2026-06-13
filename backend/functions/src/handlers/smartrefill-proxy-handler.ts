import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { proxyToSmartrefillApi } from "../services/smartrefill-api-client";

export const proxySmartrefillRequest = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const idToken = req.headers.authorization?.split("Bearer ")[1];
  if (!idToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const path = req.originalUrl.replace(/^\/smartrefill/, "") || "/";
  const method = req.method;
  const hasBody = method !== "GET" && method !== "HEAD";

  try {
    const upstream = await proxyToSmartrefillApi(path, {
      method,
      idToken,
      ...(hasBody ? { body: JSON.stringify(req.body) } : {}),
    });

    const contentType = upstream.headers.get("content-type") || "";
    res.status(upstream.status);

    if (contentType.includes("application/json")) {
      const json = await upstream.json();
      res.json(json);
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (contentType) res.setHeader("Content-Type", contentType);
    res.send(buffer);
  } catch (error) {
    res.status(502).json({
      error: "Failed to reach SmartRefill API",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
