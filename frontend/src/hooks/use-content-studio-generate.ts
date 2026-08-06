"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type {
  ContentStudioMode,
  GeneratedSocialPost,
} from "@/features/content-studio/constants";

type GenerateResponse = {
  data: {
    caption: string;
    imageUrl: string;
    mode?: ContentStudioMode;
    translatedScene?: boolean;
  };
};

export function useContentStudioGenerate() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (
      prompt: string,
      mode: ContentStudioMode = "both",
    ): Promise<GeneratedSocialPost | null> => {
      setIsGenerating(true);
      setError(null);
      try {
        const response = await apiClient.post<GenerateResponse>(
          "/content-studio/generate",
          { prompt, mode },
        );
        return {
          caption: response.data.caption ?? "",
          imageUrl: response.data.imageUrl ?? "",
          mode: response.data.mode ?? mode,
          translatedScene: response.data.translatedScene === true,
          prompt,
          timestamp: new Date().toLocaleString(),
        };
      } catch (err) {
        setError(
          err instanceof Error ?
            err.message
          : "There was an error generating content. Please try again.",
        );
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  return { generate, isGenerating, error, clearError: () => setError(null) };
}
