import {
  getGeminiApiKey,
  resolveGeminiModelCandidates,
} from "./gemini-config";
import { parseGoogleApiErrorBody } from "./api-error";

type GeminiGenerateInput = {
  system: string;
  user: string;
  modelCandidates?: string[];
  generationConfig: Record<string, unknown>;
};

function shouldTryNextGeminiModel(status: number): boolean {
  return status === 404 || status === 403 || status === 400;
}

async function geminiGenerateContent(
  input: GeminiGenerateInput,
): Promise<{ text: string | null; modelUsed?: string; error?: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { text: null, error: "Gemini API key is not configured." };
  }

  const candidates =
    input.modelCandidates && input.modelCandidates.length > 0 ?
      input.modelCandidates :
      resolveGeminiModelCandidates();

  let lastError = "Gemini request failed.";

  for (const model of candidates) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}` +
      `:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: [{ role: "user", parts: [{ text: input.user }] }],
          generationConfig: input.generationConfig,
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        lastError = parseGoogleApiErrorBody(detail);
        console.warn("geminiGenerateContent HTTP error", model, res.status, detail);
        if (res.status === 401) {
          return { text: null, error: `Gemini authentication failed: ${lastError}` };
        }
        if (shouldTryNextGeminiModel(res.status)) {
          continue;
        }
        return { text: null, error: lastError };
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
      if (text) {
        if (model !== candidates[0]) {
          console.info("geminiGenerateContent using fallback model", {
            requested: candidates[0],
            used: model,
          });
        }
        return { text, modelUsed: model };
      }

      lastError = "Gemini returned an empty response.";
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.warn("geminiGenerateContent failed", model, error);
    }
  }

  return { text: null, error: lastError };
}

export async function geminiGenerateJson<T>(input: {
  system: string;
  user: string;
  fallback: T;
  model?: string;
  modelCandidates?: string[];
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<T> {
  const candidates =
    input.modelCandidates ??
    (input.model ? resolveGeminiModelCandidates(input.model) : resolveGeminiModelCandidates());

  const result = await geminiGenerateContent({
    system: input.system,
    user: input.user,
    modelCandidates: candidates,
    generationConfig: {
      temperature: input.temperature ?? 0.35,
      maxOutputTokens: input.maxOutputTokens ?? 2048,
      responseMimeType: "application/json",
    },
  });

  if (!result.text) {
    return input.fallback;
  }

  try {
    return JSON.parse(result.text) as T;
  } catch (error) {
    console.warn("geminiGenerateJson parse failed", error);
    return input.fallback;
  }
}

export async function geminiGenerateText(input: {
  system: string;
  user: string;
  fallback: string;
  model?: string;
  modelCandidates?: string[];
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<string> {
  const candidates =
    input.modelCandidates ??
    (input.model ? resolveGeminiModelCandidates(input.model) : resolveGeminiModelCandidates());

  const result = await geminiGenerateContent({
    system: input.system,
    user: input.user,
    modelCandidates: candidates,
    generationConfig: {
      temperature: input.temperature ?? 0.7,
      maxOutputTokens: input.maxOutputTokens ?? 256,
    },
  });

  return result.text || input.fallback;
}
