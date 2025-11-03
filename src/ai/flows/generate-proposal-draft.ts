
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating initial sales proposal drafts using AI.
 *
 * The flow takes client details and recommended plans as input and returns a proposal draft.
 *
 * @interface GenerateProposalDraftInput - Defines the input schema for the generateProposalDraft function.
 * @interface GenerateProposalDraftOutput - Defines the output schema for the generateProposalDraft function.
 * @function generateProposalDraft - The main function to generate a proposal draft.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateProposalDraftInputSchema = z.object({
  clientName: z.string().describe('The name of the client.'),
  clientNeeds: z.string().describe('Description of the client needs.'),
  recommendedPlans: z.string().describe('Recommended plans for the client.'),
  companyName: z.string().describe('The name of the sales company.'),
  companyDescription: z.string().describe('A short description of the sales company.'),
});

export type GenerateProposalDraftInput = z.infer<typeof GenerateProposalDraftInputSchema>;

const GenerateProposalDraftOutputSchema = z.object({
  proposalDraft: z.string().describe('The generated proposal draft.'),
});

export type GenerateProposalDraftOutput = z.infer<typeof GenerateProposalDraftOutputSchema>;

export async function generateProposalDraft(input: GenerateProposalDraftInput): Promise<GenerateProposalDraftOutput> {
  return generateProposalDraftFlow(input);
}

const proposalDraftPrompt = ai.definePrompt({
  name: 'proposalDraftPrompt',
  input: {schema: GenerateProposalDraftInputSchema},
  output: {schema: GenerateProposalDraftOutputSchema},
  prompt: `You are an AI assistant specialized in writing compelling and caring sales proposals. Your tone should be reassuring, positive, and focused on making the client feel taken care of.

  Based on the following information, generate a professional and empathetic sales proposal draft.

  Client Name: {{{clientName}}}
  Client Needs: {{{clientNeeds}}}
  Recommended Plans: {{{recommendedPlans}}}
  Company Name: {{{companyName}}}
  Company Description: {{{companyDescription}}}

  Write a proposal that addresses the client's needs by framing the recommended plans as a complete solution that will bring them peace of mind and positive results.
  Focus on the benefits and the feeling of being looked after by Smart Refill.
  The proposal should be persuasive, well-structured, and tailored to show the client that we understand their challenges and are here to help.
  End the proposal with a friendly and clear call to action.
  `,
});

const generateProposalDraftFlow = ai.defineFlow(
  {
    name: 'generateProposalDraftFlow',
    inputSchema: GenerateProposalDraftInputSchema,
    outputSchema: GenerateProposalDraftOutputSchema,
  },
  async input => {
    const {output} = await proposalDraftPrompt(input);
    return output!;
  }
);
