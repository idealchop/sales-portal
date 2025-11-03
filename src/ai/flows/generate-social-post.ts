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
    prompt: `You are an expert social media manager for a company called Smart Refill.

    Generate a compelling and engaging social media post caption based on the following details.
    The caption should be concise, impactful, and include relevant hashtags.

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
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `A visually appealing, professional marketing image for a social media post about: ${input.topic}. The style should be ${input.style}.`,
      }),
    ]);

    const caption = (await captionResponse.output())?.text() || '';
    const imageUrl = imageResponse.media.url;

    if (!imageUrl) {
        throw new Error("Image generation failed.");
    }
    
    return {
        caption,
        imageUrl,
    };
  }
);
