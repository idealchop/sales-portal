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
import {z} from 'genkit';

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
  prompt: `You are an AI assistant specialized in writing compelling sales proposals.

  Based on the following information, generate a professional sales proposal draft.

  Client Name: {{{clientName}}}
  Client Needs: {{{clientNeeds}}}
  Recommended Plans: {{{recommendedPlans}}}
  Company Name: {{{companyName}}}
  Company Description: {{{companyDescription}}}

  Write a proposal that addresses the client's needs with the recommended plans, highlighting the benefits and value proposition.
  The proposal should be persuasive and tailored to the client.
  The output should be well-structured, professional, and ready for review and modification by a sales representative.
  Focus on the value proposition and benefits to the client.
  Be friendly and persuasive, but not overly verbose.
  End the proposal with a call to action.
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
