export const CONTENT_STUDIO_SUGGESTIONS = [
  "A team of happy professionals in a modern office, collaborating on a project, with glasses of water on their desks.",
  "A warehouse worker feeling energetic and successful, taking a break with a refreshing water bottle.",
  "A family in their clean, bright kitchen, laughing and drinking water together.",
  "An aerial shot of a delivery van with the Smart Refill logo driving through a business district, symbolizing efficiency.",
  "A close-up shot of a person's hand holding a glass of sparkling clean water, with a blurred office background.",
] as const;

export const CONTENT_STUDIO_BRAND_PRESETS = [
  {
    id: "office-wellness",
    label: "Office wellness",
    prompt:
      "Smart Refill branded water station in a bright modern office, diverse Filipino professionals refilling bottles, clean teal and white brand colors, optimistic lifestyle photo.",
  },
  {
    id: "delivery-ops",
    label: "Delivery operations",
    prompt:
      "Smart Refill delivery team loading purified water containers, organized warehouse, professional uniforms, efficient logistics scene in the Philippines.",
  },
  {
    id: "family-trust",
    label: "Family trust",
    prompt:
      "Filipino family in a clean kitchen using a Smart Refill water dispenser, warm natural light, trustworthy and healthy home moment.",
  },
  {
    id: "sustainability",
    label: "Sustainability",
    prompt:
      "Reusable water bottles and Smart Refill refill station, reduced plastic waste message, eco-friendly modern visual, minimal text overlay space.",
  },
] as const;

export type GeneratedSocialPost = {
  caption: string;
  imageUrl: string;
  prompt: string;
  timestamp: string;
};
