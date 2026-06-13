"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { GeneratedSocialPost } from "@/features/content-studio/constants";

type GenerateResponse = {
  data: {
    caption: string;
    imageUrl: string;
  };
};

export function useContentStudioGenerate() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (prompt: string): Promise<GeneratedSocialPost | null> => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await apiClient.post<GenerateResponse>(
        "/content-studio/generate",
        { prompt },
      );
      return {
        ...response.data,
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
  }, []);

  return { generate, isGenerating, error, clearError: () => setError(null) };
}
