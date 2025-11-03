
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating social media posts with AI.
 *
 * The flow takes a topic and a style as input and returns a post caption and a generated image.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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
    model: 'googleai/gemini-pro',
    prompt: `You are a friendly and caring social media manager for Smart Refill.

    Your goal is to write a short, positive caption (under 25 words) that makes customers feel looked after and secure.

    Your tone should be:
    - Caring and reassuring
    - Focused on positive results and benefits
    - Human and empathetic

    Key themes to emphasize:
    - The peace of mind that comes with our automated service.
    - How we take care of water safety and compliance so they don't have to.
    - The convenience and reliability we bring to their daily lives.

    Generate a compelling caption based on the following details. The caption should be concise and leave the reader with a feeling of trust and positivity.

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
    // Generate caption
    const captionResponse = await socialPostCaptionPrompt(input);
    const caption = captionResponse.output?.caption || 'Enjoy the convenience of Smart Refill!';

    // Use a static branded placeholder image to avoid billing errors with Imagen
    const staticImageUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FSmartRefill_Social_Placeholder.png?alt=media&token=16757b53-41c3-4d6b-a253-61f282c1990c';

    return {
      caption,
      imageUrl: staticImageUrl,
    };
  }
);
