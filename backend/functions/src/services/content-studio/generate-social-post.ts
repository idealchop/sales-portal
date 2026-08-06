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

export type ContentStudioMode = "both" | "caption" | "image";

export type GenerateSocialPostInput = {
  prompt: string;
  mode?: ContentStudioMode;
};

export type GenerateSocialPostResult = {
  caption: string;
  imageUrl: string;
  mode: ContentStudioMode;
  /** True when a Gemini translate step ran before Imagen. */
  translatedScene: boolean;
};

const PH_LANGUAGE_MARKERS = new RegExp(
  [
    "\\b(",
    "ang|mga|sa|ng|na|po|opo|yung|para|hindi|ito|iyan|umiiinom|masaya|",
    "opisina|tubig|pamilya|familia|sabi|namin|ninyo|kayo|ako|siya|nila|",
    "natin|wala|meron|mayroon|kung|dahil|pero|at|o|ba|nga|lang|naman|",
    "dito|doon|yun|tapos|kasi|talaga|salamat|maganda|malinis",
    ")\\b",
  ].join(""),
  "i",
);

/**
 * Skip Gemini scene translation when the prompt is already usable English.
 * Heuristic only — false negatives still translate (safer for Imagen quality).
 */
export function promptNeedsSceneTranslation(prompt: string): boolean {
  const text = prompt.trim();
  if (!text) return false;
  // Non-ASCII → likely Tagalog/dialect or accented copy; translate.
  // eslint-disable-next-line no-control-regex -- intentional ASCII-range check
  if (/[^\u0000-\u007F]/.test(text)) return true;
  if (PH_LANGUAGE_MARKERS.test(text)) return true;
  return false;
}

function buildImagePrompt(sceneDescription: string): string {
  return `${IMAGE_PROMPT_PREFIX} ${sceneDescription.trim()}`;
}

function normalizeMode(mode: unknown): ContentStudioMode {
  if (mode === "caption" || mode === "image" || mode === "both") return mode;
  return "both";
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
    operation: "contentStudio.translate",
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
    operation: "contentStudio.caption",
  });
}

async function generateImageDataUri(
  prompt: string,
  geminiModelCandidates: string[],
): Promise<{ imageUrl: string; translatedScene: boolean }> {
  let scene = prompt.trim();
  let translatedScene = false;
  if (promptNeedsSceneTranslation(scene)) {
    scene = await translatePromptForImage(scene, geminiModelCandidates);
    translatedScene = true;
  }
  const imageUrl = await imagenGenerateDataUri(buildImagePrompt(scene));
  return { imageUrl, translatedScene };
}

export async function generateSocialPost(
  input: GenerateSocialPostInput,
): Promise<GenerateSocialPostResult> {
  const prompt = input.prompt.trim();
  const mode = normalizeMode(input.mode);

  if (prompt.length < 10) {
    throw new Error("Prompt must be at least 10 characters.");
  }
  if (prompt.length > 2000) {
    throw new Error("Prompt must be 2000 characters or fewer.");
  }

  const geminiModelCandidates = resolveGeminiModelCandidates();
  const wantCaption = mode === "both" || mode === "caption";
  const wantImage = mode === "both" || mode === "image";

  if (wantCaption && wantImage) {
    const [caption, image] = await Promise.all([
      generateCaption(prompt, geminiModelCandidates),
      generateImageDataUri(prompt, geminiModelCandidates),
    ]);
    return {
      caption,
      imageUrl: image.imageUrl,
      mode,
      translatedScene: image.translatedScene,
    };
  }

  if (wantCaption) {
    const caption = await generateCaption(prompt, geminiModelCandidates);
    return {
      caption,
      imageUrl: "",
      mode,
      translatedScene: false,
    };
  }

  const image = await generateImageDataUri(prompt, geminiModelCandidates);
  return {
    caption: "",
    imageUrl: image.imageUrl,
    mode,
    translatedScene: image.translatedScene,
  };
}
