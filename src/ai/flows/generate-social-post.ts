
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
    // Generate caption and initial image in parallel
    const [captionResponse, initialImageResponse] = await Promise.all([
      socialPostCaptionPrompt(input),
      ai.generate({
        model: 'vertexai/gemini-1.5-flash-001',
        prompt: `Generate a visually appealing, professional image related to the topic of: ${input.topic}. The image should be suitable for a social media post for a water delivery service called Smart Refill.`,
      }),
    ]);

    const caption = captionResponse.output?.caption || 'Enjoy the convenience of Smart Refill!';
    const initialImageUrl = initialImageResponse.output?.imageUrl;

    if (!initialImageUrl) {
      throw new Error('Failed to generate initial image.');
    }

    // Define the logo and tagline images (these should be accessible via URL or as data URIs)
    const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Brand%20Logo%2FAsset%2022.png?alt=media&token=f7458efe-afd7-4006-862e-40c8d524c080';
    const taglineUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Brand%20Logo%2FAsset%2042.png?alt=media&token=27a7102a-39b0-4665-a72a-912b79a01f9b';

    // Second step: Composite the images using Gemini 1.5 Flash's image editing capabilities
    const finalImageResponse = await ai.generate({
      model: 'vertexai/gemini-1.5-flash-001',
      prompt: [
        { media: { url: initialImageUrl } },
        { media: { url: logoUrl } },
        { media: { url: taglineUrl } },
        { text: 'Overlay the Smart Refill logo and tagline onto the base image in a professional and aesthetically pleasing way. The logo should be prominent but not obstructive, and the tagline should be clearly legible. Place them in the bottom corner or a suitable area that doesn't cover the main subject of the image.' },
      ],
      config: {
        responseModalities: ['IMAGE'],
      },
    });

    const finalImageUrl = finalImageResponse.output?.imageUrl;

    if (!finalImageUrl) {
      // Fallback to the initial image if the composition fails
      return {
        caption,
        imageUrl: initialImageUrl,
      };
    }

    return {
      caption,
      imageUrl: finalImageUrl,
    };
  }
);
