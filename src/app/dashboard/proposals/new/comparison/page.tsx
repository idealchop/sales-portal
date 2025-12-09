
'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useSearchParams } from 'next/navigation';
import { ExternalLink } from 'lucide-react';

const faqData = [
  {
    question: 'How does Smart Refill work?',
    answer: 'Smart Refill automates your water refills based on your schedule and usage patterns. You can track deliveries, water quality, and compliance all in the app.',
  },
  {
    question: 'Is the water safe?',
    answer: 'Yes. Every delivery passes strict quality checks, and partner water stations are continuously monitored to ensure clean and safe drinking water.',
  },
  {
    question: 'Do I still need to message or call to reorder?',
    answer: 'No. Refills are fully automated. You’ll only receive notifications for scheduled deliveries, completed refills, or available quality reports.',
  },
  {
    question: 'What if I want to change my schedule or report an issue?',
    answer: 'You can adjust your delivery schedule, pause service, or request urgent refills directly in the app. Our support team is available 24/7 to help.',
  },
  {
    question: 'Do you offer nationwide service?',
    answer: 'Yes. Smart Refill works with 200+ verified water stations across the Philippines, with coverage expanding continuously.',
  },
  {
    question: 'Are containers and dispensers free?',
    answer: 'Containers are free to use. Dispensers depend on your plan—some include free use, while others offer discounted rental or purchase options.',
  },
  {
    question: 'How much does the plan cost? Do unused liters carry over?',
    answer: 'Plans start at ₱2–₱3 per liter. Any unused liters automatically roll over to the next month.',
  },
  {
    question: 'Is the app free, and what can it do?',
    answer: 'Yes. The app is included in your plan at no extra cost. It lets you track deliveries, view water quality reports, manage schedules and payments, and request urgent refills anytime.',
  },
];


export default function ComparisonPage() {
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());

  const prevLink = `/dashboard/proposals/new/about?${params.toString()}`;
  const nextLink = `/dashboard/proposals/new/plans?${params.toString()}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Frequently Asked Questions</h1>
          <p className="text-muted-foreground">
            Step 3: Common questions about the Smart Refill service.
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href={prevLink}>Previous</Link>
            </Button>
            <Button asChild>
                <Link href={nextLink}>Next Step</Link>
            </Button>
        </div>
      </div>

      <div className="container mx-auto px-0 space-y-6">
        <div className="grid md:grid-cols-2 gap-6 items-start rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="relative aspect-video rounded-lg overflow-hidden">
                <Image 
                    src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FSales_Smartreill.png?alt=media&token=b55f3099-38a1-45f9-98d8-cd530fb7b427"
                    alt="Business professionals in a meeting"
                    fill
                    className="object-cover"
                    data-ai-hint="business meeting"
                />
            </div>

            <Card className="shadow-md">
                <CardContent className="p-0">
                <Accordion type="single" collapsible defaultValue={faqData[0].question}>
                    {faqData.map((item) => (
                    <AccordionItem value={item.question} key={item.question}>
                        <AccordionTrigger className="px-6 text-base font-semibold text-left">
                        {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 text-muted-foreground">
                          {item.answer}
                        </AccordionContent>
                    </AccordionItem>
                    ))}
                </Accordion>
                </CardContent>
            </Card>
        </div>
         <Card className="bg-muted/50">
            <CardHeader>
                <CardTitle>Explore the Smart Refill App</CardTitle>
                <CardDescription>See how you can manage your water supply, monitor consumption, and handle payments all in one place. </CardDescription>
            </CardHeader>
            <CardContent>
                 <Button asChild>
                    <Link href="https://app.riverph.com" target="_blank">
                        Visit app.riverph.com <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
