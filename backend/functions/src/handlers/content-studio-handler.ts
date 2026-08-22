import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import {
  generateSocialPost,
  type ContentStudioMode,
} from "../services/content-studio/generate-social-post";
import { formatErrorMessage } from "../services/ai/api-error";
import { logger } from "firebase-functions";

const CONTENT_STUDIO_ROLES = new Set(["sales", "manager", "admin"]);

function parseMode(value: unknown): ContentStudioMode {
  if (value === "caption" || value === "image" || value === "both") return value;
  return "both";
}

export const postGenerateSocialPost = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const role = req.user?.role;
  if (!role || !CONTENT_STUDIO_ROLES.has(role)) {
    res.status(403).json({ error: "You do not have access to Content Studio." });
    return;
  }

  const prompt =
    req.body && typeof req.body.prompt === "string" ? req.body.prompt : "";
  if (!prompt.trim()) {
    res.status(400).json({ error: "Prompt is required." });
    return;
  }

  const mode = parseMode(
    req.body && typeof req.body === "object" ?
      (req.body as { mode?: unknown }).mode :
      undefined,
  );

  try {
    const data = await generateSocialPost({ prompt, mode });
    res.json({ data });
  } catch (error) {
    const message = formatErrorMessage(error);
    logger.error(
      `Content Studio generation failed (uid=${req.user?.uid ?? "unknown"} mode=${mode}): ${message}`,
    );
    res.status(500).json({ error: message });
  }
};
