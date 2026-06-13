/**
 * Gemini text models, newest → oldest.
 * The client tries each in order until one succeeds (404 / unavailable → next).
 */
export const GEMINI_MODEL_CHAIN = [
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
] as const;

export type GeminiModelId = (typeof GEMINI_MODEL_CHAIN)[number];

export function getGeminiApiKey(): string | undefined {
  return (
    process.env.SALES_PORTAL_GEMINI_API_KEY || process.env.GEMINI_API_KEY
  );
}

export function normalizeGeminiModelId(model: string): string {
  return model.trim().replace(/^models\//i, "");
}

export function isValidGeminiModelId(model: string): boolean {
  const normalized = normalizeGeminiModelId(model);
  return /^gemini-[a-z0-9][a-z0-9.-]*$/i.test(normalized);
}

function appendModel(candidates: string[], model?: string) {
  if (!model?.trim()) return;
  const normalized = normalizeGeminiModelId(model);
  if (!isValidGeminiModelId(normalized)) return;
  if (!candidates.includes(normalized)) {
    candidates.push(normalized);
  }
}

/** Ordered models to try — optional one-off override first, then the 5-model chain. */
export function resolveGeminiModelCandidates(requestOverride?: string): string[] {
  const candidates: string[] = [];
  appendModel(candidates, requestOverride);
  for (const model of GEMINI_MODEL_CHAIN) {
    appendModel(candidates, model);
  }
  return candidates;
}

export function getGeminiModel(): string {
  return GEMINI_MODEL_CHAIN[0];
}

/** Gemini native image models (generateContent + IMAGE modality), newest → oldest. */
export const GEMINI_IMAGE_MODEL_CHAIN = [
  "gemini-3.1-flash-image-preview",
  "gemini-2.5-flash-image",
] as const;

export function getImagenModel(): string {
  return process.env.IMAGEN_MODEL || "imagen-4.0-fast-generate-001";
}

export function normalizeImagenModelId(model: string): string {
  return model.trim().replace(/^models\//i, "");
}

export function isValidImagenModelId(model: string): boolean {
  const normalized = normalizeImagenModelId(model);
  return /^imagen-[a-z0-9][a-z0-9.-]*$/i.test(normalized);
}

export function resolveImagenModel(requestModel?: string): string {
  if (requestModel && isValidImagenModelId(requestModel)) {
    return normalizeImagenModelId(requestModel);
  }
  if (process.env.IMAGEN_MODEL && isValidImagenModelId(process.env.IMAGEN_MODEL)) {
    return normalizeImagenModelId(process.env.IMAGEN_MODEL);
  }
  return getImagenModel();
}
