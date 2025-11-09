
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating social media posts with AI.
 *
 * The flow takes a detailed prompt for an image and returns a generated image and a relevant caption.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getStorage, ref, uploadString } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { googleAI } from '@genkit-ai/google-genai';

const SocialPostInputSchema = z.object({
  prompt: z.string().describe('A detailed prompt for the social media image to be generated.'),
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
    model: googleAI.model('gemini-1.0-pro'),
    prompt: `You are a friendly and caring social media manager for Smart Refill.

    Your goal is to write a short, positive caption (under 25 words) that makes customers feel looked after and secure, based on the theme of an image.

    Your tone should be:
    - Caring and reassuring
    - Focused on positive results and benefits
    - Human and empathetic

    Key themes to emphasize:
    - The peace of mind that comes with our automated service.
    - How we take care of water safety and compliance so they don't have to.
    - The convenience and reliability we bring to their daily lives.

    Generate a compelling caption based on the following image description. The caption should be concise and leave the reader with a feeling of trust and positivity.

    Image Description: {{{prompt}}}
    `,
});


const generateSocialPostFlow = ai.defineFlow(
  {
    name: 'generateSocialPostFlow',
    inputSchema: SocialPostInputSchema,
    outputSchema: SocialPostOutputSchema,
  },
  async (input) => {
    const { firebaseApp } = initializeFirebase();
    const storage = getStorage(firebaseApp);

    // Generate caption and image in parallel
    const [captionResult, imageResult] = await Promise.all([
      socialPostCaptionPrompt(input),
      ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `Create a modern, clean, and professional social media image for 'Smart Refill'.
        The image must feature people in their environment (office, house, or warehouse).
        It should show them working, feeling successful, productive, and healthy.
        The underlying theme is that Smart Refill's water service fuels their success.
        The image should NOT be a static product shot.
        The overall topic is: ${input.prompt}.`,
      }),
    ]);

    const caption = captionResult.output?.caption || 'Enjoy the convenience of Smart Refill!';
    const imageUrl = imageResult.media.url;

    if (!imageUrl) {
        throw new Error("Image generation failed.");
    }
    
    const imagePath = `sales_portal/marketing_mats/social-post-${Date.now()}.png`;
    const storageRef = ref(storage, imagePath);
    await uploadString(storageRef, imageUrl, 'data_url');

    return {
      caption,
      imageUrl,
    };
  }
);

    
