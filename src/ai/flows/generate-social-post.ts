
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
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `A visually stunning, high-quality, professional photograph for a social media post about: ${input.topic}. Style: ${input.style}.`,
      }),
    ]);

    const caption = captionResponse.output?.caption || '';
    const initialImageUrl = initialImageResponse.media.url;

    const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FSmartRefill_Logo_OnDark.png?alt=media&token=815252d4-3151-4089-a292-02685a18a034';
    const taglineUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FSmartRefill_Tagline_OnDark.png?alt=media&token=1e18d6c8-99b5-4b36-8208-8f5413158c54';

    // Add branding to the generated image
    const brandedImageResponse = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: [
        { media: { url: initialImageUrl } },
        { media: { url: logoUrl } },
        { media: { url: taglineUrl } },
        { text: 'Overlay the provided logo and tagline onto the image in a professional and aesthetically pleasing way. The logo should be prominent but not obscure the main subject. The tagline should be legible and well-placed.' },
      ],
      config: {
        responseModalities: ['IMAGE'],
      },
    });

    const brandedImageUrl = brandedImageResponse.media.url;

    return {
      caption,
      imageUrl: brandedImageUrl,
    };
  }
);
