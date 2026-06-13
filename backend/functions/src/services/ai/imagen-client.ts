import {
  GEMINI_IMAGE_MODEL_CHAIN,
  getGeminiApiKey,
} from "./gemini-config";
import { parseGoogleApiErrorBody } from "./api-error";

/** Imagen models, newest → oldest. */
export const IMAGEN_MODEL_CHAIN = [
  "imagen-4.0-fast-generate-001",
  "imagen-4.0-generate-001",
] as const;

const MAX_IMAGE_PROMPT_CHARS = 1800;

function truncatePrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (trimmed.length <= MAX_IMAGE_PROMPT_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_IMAGE_PROMPT_CHARS - 1)}…`;
}

function shouldTryNextModel(status: number): boolean {
  return status === 404 || status === 403 || status === 400;
}

function toDataUri(mimeType: string, encoded: string): string {
  return `data:${mimeType || "image/png"};base64,${encoded}`;
}

async function imagenPredict(
  apiKey: string,
  model: string,
  safePrompt: string,
): Promise<string | null> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}` +
    `:predict?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: safePrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "16:9",
        personGeneration: "allow_adult",
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    const message = parseGoogleApiErrorBody(detail);
    console.warn("imagenGenerate HTTP error", model, res.status, detail);
    if (res.status === 401) {
      throw new Error(`Image authentication failed: ${message}`);
    }
    if (shouldTryNextModel(res.status)) {
      return null;
    }
    throw new Error(`Imagen request failed (${res.status}): ${message}`);
  }

  const data = (await res.json()) as {
    predictions?: Array<{
      bytesBase64Encoded?: string;
      mimeType?: string;
    }>;
  };

  const prediction = data.predictions?.[0];
  const encoded = prediction?.bytesBase64Encoded;
  if (!encoded) {
    console.warn("imagenGenerate empty response", model);
    return null;
  }

  return toDataUri(prediction?.mimeType || "image/png", encoded);
}

async function geminiImageGenerate(
  apiKey: string,
  model: string,
  safePrompt: string,
): Promise<string | null> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}` +
    `:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: safePrompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: "16:9" },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    const message = parseGoogleApiErrorBody(detail);
    console.warn("geminiImageGenerate HTTP error", model, res.status, detail);
    if (res.status === 401) {
      throw new Error(`Image authentication failed: ${message}`);
    }
    if (shouldTryNextModel(res.status)) {
      return null;
    }
    throw new Error(`Gemini image request failed (${res.status}): ${message}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
        }>;
      };
    }>;
  };

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const inlineData = parts.find((part) => part.inlineData?.data)?.inlineData;
  if (!inlineData?.data) {
    console.warn("geminiImageGenerate empty response", model);
    return null;
  }

  return toDataUri(inlineData.mimeType || "image/png", inlineData.data);
}

export async function imagenGenerateDataUri(prompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "AI generation is not configured (missing SALES_PORTAL_GEMINI_API_KEY).",
    );
  }

  const safePrompt = truncatePrompt(prompt);
  let lastError = "Image generation failed.";

  for (const model of IMAGEN_MODEL_CHAIN) {
    try {
      const dataUri = await imagenPredict(apiKey, model, safePrompt);
      if (dataUri) {
        if (model !== IMAGEN_MODEL_CHAIN[0]) {
          console.info("imagenGenerate using fallback model", {
            requested: IMAGEN_MODEL_CHAIN[0],
            used: model,
          });
        }
        return dataUri;
      }
      lastError = `Imagen model ${model} is unavailable.`;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Image authentication")) {
        throw error;
      }
      lastError = error instanceof Error ? error.message : String(error);
      console.warn("imagenGenerate failed", model, error);
    }
  }

  for (const model of GEMINI_IMAGE_MODEL_CHAIN) {
    try {
      const dataUri = await geminiImageGenerate(apiKey, model, safePrompt);
      if (dataUri) {
        console.info("imagenGenerate using Gemini image fallback", { model });
        return dataUri;
      }
      lastError = `Gemini image model ${model} is unavailable.`;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Image authentication")) {
        throw error;
      }
      lastError = error instanceof Error ? error.message : String(error);
      console.warn("geminiImageGenerate failed", model, error);
    }
  }

  throw new Error(lastError);
}
