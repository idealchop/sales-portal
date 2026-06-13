export const CONTENT_STUDIO_SUGGESTIONS = [
  "A team of happy professionals in a modern office, collaborating on a project, with glasses of water on their desks.",
  "A warehouse worker feeling energetic and successful, taking a break with a refreshing water bottle.",
  "A family in their clean, bright kitchen, laughing and drinking water together.",
  "An aerial shot of a delivery van with the Smart Refill logo driving through a business district, symbolizing efficiency.",
  "A close-up shot of a person's hand holding a glass of sparkling clean water, with a blurred office background.",
] as const;

export type GeneratedSocialPost = {
  caption: string;
  imageUrl: string;
  prompt: string;
  timestamp: string;
};
