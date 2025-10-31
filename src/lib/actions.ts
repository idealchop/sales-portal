'use server';

import { generateProposalDraft } from '@/ai/flows/generate-proposal-draft';
import { z } from 'zod';
import { clients } from './data';

const ProposalSchema = z.object({
  clientId: z.string().min(1, "Client is required."),
  clientNeeds: z.string().min(10, "Client needs must be at least 10 characters."),
  recommendedPlans: z.string().min(10, "Recommended plans must be at least 10 characters."),
});

export async function generateDraftAction(data: { clientId: string; clientNeeds: string; recommendedPlans: string; }) {
  const validatedFields = ProposalSchema.safeParse(data);

  if (!validatedFields.success) {
    console.error(validatedFields.error.flatten().fieldErrors);
    return {
      success: false,
      message: 'Invalid data. Please check the fields.',
      draft: null,
    };
  }

  const client = clients.find(c => c.id === validatedFields.data.clientId);
  if (!client) {
    return {
      success: false,
      message: 'Client not found.',
      draft: null,
    };
  }

  try {
    const result = await generateProposalDraft({
      clientName: client.companyName,
      clientNeeds: validatedFields.data.clientNeeds,
      recommendedPlans: validatedFields.data.recommendedPlans,
      companyName: 'SmartSales AI',
      companyDescription: 'Your partner in scalable sales solutions, providing cutting-edge technology to streamline your sales process and drive growth.',
    });
    return {
      success: true,
      message: 'Draft generated successfully.',
      draft: result.proposalDraft,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: 'Failed to generate draft. Please try again later.',
      draft: null,
    };
  }
}
