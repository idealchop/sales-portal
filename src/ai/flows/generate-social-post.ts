'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating social media posts with AI.
 *
 * The flow takes a topic and a style as input and returns a post caption and a generated image.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SocialPostInputSchema = z.object({
  topic: z.string().describe('The topic for the social media post.'),
  style: z.string().describe('The desired style or tone of the post (e.g., Professional, Witty, Urgent).'),
});

export type SocialPostInput = z.infer<typeof SocialPostInputSchema>;

const SocialPostOutputSchema = z.object({
  caption: z.string().describe('The generated text content for the social media post.'),
  imageUrl: z.string().describe('A data URI of a generated image relevant to the post topic. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'),
});

export type SocialPostOutput = z.infer<typeof SocialPostOutputSchema>;

export async function generateSocialPost(input: SocialPostInput): Promise<SocialPostOutput> {
  return generateSocialPostFlow(input);
}

const socialPostCaptionPrompt = ai.definePrompt({
    name: 'socialPostCaptionPrompt',
    input: { schema: SocialPostInputSchema },
    output: { schema: z.object({ caption: z.string() })},
    prompt: `You are an expert social media manager for a company called Smart Refill.

    Your goal is to write a short, positive, and professional caption (under 25 words) for a social media post.

    Your tone should be:
    - Optimistic and clear
    - Reassuring and human
    - Lightly promotional

    Focus on these key themes:
    - Automation and convenience
    - Safety and compliance
    - Reliability and efficiency

    Generate a compelling and engaging social media post caption based on the following details. The caption should be concise, impactful, and include relevant hashtags.

    Topic: {{{topic}}}
    Style: {{{style}}}
    `,
});


const generateSocialPostFlow = ai.defineFlow(
  {
    name: 'generateSocialPostFlow',
    inputSchema: SocialPostInputSchema,
    outputSchema: SocialPostOutputSchema,
  },
  async (input) => {
    
    // Generate caption and image in parallel
    const [captionResponse, imageResponse] = await Promise.all([
      socialPostCaptionPrompt(input),
      ai.generate({
        prompt: `Generate a URL for a stock photo from Unsplash that visually represents the following topic for a social media post: "${input.topic}". The URL should be in the format: https://images.unsplash.com/photo-...?ixid=...&... Just return the URL and nothing else.`,
      }),
    ]);
    
    const caption = captionResponse.output?.caption || '';
    const imageUrl = imageResponse.text || `https://picsum.photos/seed/${Math.floor(Math.random() * 1000)}/1280/720`;
    
    return {
        caption,
        imageUrl,
    };
  }
);
