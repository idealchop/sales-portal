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
    
    // Generate caption and initial image in parallel
    const [captionResponse, initialImageResponse] = await Promise.all([
      socialPostCaptionPrompt(input),
      ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `A visually appealing stock photo representing: "${input.topic}". The image should be clean, modern, and professional.`,
      }),
    ]);
    
    const caption = captionResponse.output?.caption || '';
    const initialImageUrl = initialImageResponse.media.url;
    
    const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Brand%20Logo%2FLogo%20icon%202.png?alt=media&token=e9c98391-d60e-4267-9d78-3c09b8028b7c';
    const brandingText = "Automated Water Refills for Every Home and Business";

    // Step 2: Add logo and text to the generated image
    const brandedImageResponse = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image-preview',
        prompt: [
            { media: { url: initialImageUrl } },
            { media: { url: logoUrl } },
            { text: `Overlay the provided logo on the bottom-right corner of the main image. Make the logo visible but not too intrusive. Below the logo, add the text "${brandingText}" in a clean, readable, white font. Ensure the final image looks professional and well-branded.` },
        ],
        config: {
            responseModalities: ['IMAGE'],
        },
    });

    const imageUrl = brandedImageResponse.media.url || initialImageUrl; // Fallback to initial image

    return {
        caption,
        imageUrl,
    };
  }
);
