/**
 * Structured AI usage logs for cost oversight (Cloud Logging → Monitoring).
 * Never log API keys or full prompts.
 */

export type AiUsageApp = "sales-portal" | "smartrefill";

export type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

export function extractGeminiUsageMetadata(
  data: unknown,
): GeminiUsageMetadata | undefined {
  if (!data || typeof data !== "object") return undefined;
  const usage = (data as { usageMetadata?: Record<string, unknown> }).usageMetadata;
  if (!usage || typeof usage !== "object") return undefined;
  const promptTokenCount =
    typeof usage.promptTokenCount === "number" ? usage.promptTokenCount : undefined;
  const candidatesTokenCount =
    typeof usage.candidatesTokenCount === "number" ?
      usage.candidatesTokenCount :
      undefined;
  const totalTokenCount =
    typeof usage.totalTokenCount === "number" ? usage.totalTokenCount : undefined;
  if (
    promptTokenCount === undefined &&
    candidatesTokenCount === undefined &&
    totalTokenCount === undefined
  ) {
    return undefined;
  }
  return { promptTokenCount, candidatesTokenCount, totalTokenCount };
}

export function logAiUsage(input: {
  app: AiUsageApp;
  provider: "gemini" | "imagen";
  operation: string;
  model: string;
  ok: boolean;
  usage?: GeminiUsageMetadata;
  status?: number;
  extra?: Record<string, unknown>;
}): void {
  const payload = {
    event: "ai_usage",
    app: input.app,
    provider: input.provider,
    operation: input.operation,
    model: input.model,
    ok: input.ok,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.usage?.promptTokenCount !== undefined ?
      { promptTokenCount: input.usage.promptTokenCount } :
      {}),
    ...(input.usage?.candidatesTokenCount !== undefined ?
      { candidatesTokenCount: input.usage.candidatesTokenCount } :
      {}),
    ...(input.usage?.totalTokenCount !== undefined ?
      { totalTokenCount: input.usage.totalTokenCount } :
      {}),
    ...(input.extra ?? {}),
  };
  // Structured JSON line — queryable in Cloud Logging.
  console.info(JSON.stringify(payload));
}
