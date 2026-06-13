import { resolveGeminiModelCandidates } from "../ai/gemini-config";
import { geminiGenerateText } from "../ai/gemini-client";
import { imagenGenerateDataUri } from "../ai/imagen-client";

const CAPTION_SYSTEM = `You are a friendly social media manager for Smart Refill, a water refill business platform in the Philippines.

The user's image description may be written in English, Tagalog, Filipino, or regional Philippine dialects (e.g. Cebuano/Bisaya, Ilocano, Hiligaynon/Ilonggo, Bicolano, Waray, Kapampangan, Pangasinan). Understand the meaning accurately regardless of language or dialect.

Write a short, positive caption (under 25 words) that makes customers feel looked after and secure.
Tone: caring, reassuring, focused on peace of mind, convenience, and reliability — natural for Filipino social media.
Language: match the user's prompt — if they wrote in Tagalog or a regional dialect, caption in that same language; if English, caption in English.
Do not use hashtags. Return only the caption text.`;

const IMAGE_SCENE_TRANSLATOR = `You prepare scene descriptions for an image generation model.

The input may be English, Tagalog, Filipino, or regional Philippine dialects (Cebuano/Bisaya, Ilocano, Hiligaynon, Bicolano, Waray, Kapampangan, Pangasinan, etc.). Interpret the meaning accurately and preserve people, setting, mood, activities, and cultural context.

Return only a clear English scene description suitable for AI image generation. Output must be English only. No preamble, labels, or quotes.`;

const IMAGE_PROMPT_PREFIX =
  "Professional social media photo for Smart Refill, a Philippine water refill business. " +
  "People in a real workplace or home setting, productive and healthy. Not a product-only shot. Scene:";

export type GenerateSocialPostInput = {
  prompt: string;
};

export type GenerateSocialPostResult = {
  caption: string;
  imageUrl: string;
};

function buildImagePrompt(sceneDescription: string): string {
  return `${IMAGE_PROMPT_PREFIX} ${sceneDescription.trim()}`;
}

async function translatePromptForImage(
  prompt: string,
  modelCandidates: string[],
): Promise<string> {
  const translated = await geminiGenerateText({
    system: IMAGE_SCENE_TRANSLATOR,
    user: prompt.trim(),
    fallback: prompt.trim(),
    modelCandidates,
    maxOutputTokens: 320,
    temperature: 0.2,
  });
  return translated.trim() || prompt.trim();
}

async function generateCaption(
  prompt: string,
  modelCandidates: string[],
): Promise<string> {
  return geminiGenerateText({
    system: CAPTION_SYSTEM,
    user: `Generate a compelling caption based on this image description:\n\n${prompt.trim()}`,
    fallback:
      "Enjoy the convenience and peace of mind that Smart Refill brings to your day.",
    modelCandidates,
    maxOutputTokens: 120,
    temperature: 0.75,
  });
}

async function generateImageDataUri(
  prompt: string,
  geminiModelCandidates: string[],
): Promise<string> {
  const sceneDescription = await translatePromptForImage(prompt, geminiModelCandidates);
  return imagenGenerateDataUri(buildImagePrompt(sceneDescription));
}

export async function generateSocialPost(
  input: GenerateSocialPostInput,
): Promise<GenerateSocialPostResult> {
  const prompt = input.prompt.trim();
  if (prompt.length < 10) {
    throw new Error("Prompt must be at least 10 characters.");
  }
  if (prompt.length > 2000) {
    throw new Error("Prompt must be 2000 characters or fewer.");
  }

  const geminiModelCandidates = resolveGeminiModelCandidates();

  const [caption, imageUrl] = await Promise.all([
    generateCaption(prompt, geminiModelCandidates),
    generateImageDataUri(prompt, geminiModelCandidates),
  ]);

  return { caption, imageUrl };
}
