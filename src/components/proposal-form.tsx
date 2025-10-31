'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateDraftAction } from '@/lib/actions';
import type { Client } from '@/lib/definitions';

const formSchema = z.object({
  clientId: z.string().min(1, 'Please select a client.'),
  clientNeeds: z.string().min(20, 'Please describe the client needs in at least 20 characters.'),
  recommendedPlans: z.string().min(20, 'Please describe the recommended plans in at least 20 characters.'),
  proposalContent: z.string().min(100, 'Proposal content must be at least 100 characters.'),
});

type ProposalFormValues = z.infer<typeof formSchema>;

export function ProposalForm({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, startGenerationTransition] = useTransition();

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: '',
      clientNeeds: '',
      recommendedPlans: '',
      proposalContent: '',
    },
  });

  const handleGenerateDraft = async () => {
    const { clientId, clientNeeds, recommendedPlans } = form.getValues();
    
    if (!clientId || !clientNeeds || !recommendedPlans) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a client and fill in their needs and recommended plans before generating a draft.',
      });
      return;
    }

    startGenerationTransition(async () => {
      const result = await generateDraftAction({ clientId, clientNeeds, recommendedPlans });
      if (result.success && result.draft) {
        form.setValue('proposalContent', result.draft);
        toast({
          title: 'Draft Generated',
          description: 'The AI-powered draft has been added to the proposal content.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Generation Failed',
          description: result.message,
        });
      }
    });
  };

  const onSubmit = (data: ProposalFormValues) => {
    console.log(data);
    toast({
      title: 'Proposal Saved!',
      description: 'Your new proposal has been successfully saved.',
    });
    router.push('/dashboard/proposals');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Proposal Content</CardTitle>
                <CardDescription>
                  This is the main body of your proposal. You can write it yourself or generate a draft using AI.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="proposalContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Write your proposal here..."
                          className="min-h-[400px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Details</CardTitle>
                <CardDescription>Provide the details needed to generate the proposal.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientNeeds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Needs</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="e.g., Reduce energy costs, improve sustainability..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="recommendedPlans"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recommended Plans</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="e.g., Solar panel installation, energy audit..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            <div className="flex flex-col gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateDraft}
                    disabled={isGenerating}
                >
                    {isGenerating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate with AI
                </Button>
                 <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Proposal
                </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
