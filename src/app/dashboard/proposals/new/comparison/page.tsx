
'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useSearchParams } from 'next/navigation';

const comparisonData = [
  {
    aspect: 'Pricing Structure',
    traditional: 'Pay per gallon, with prices ranging from ₱30 to ₱100 each, depending on the business location.',
    smartRefill: 'Pay a fixed monthly fee based on liters (₱2.50–₱3.00/L), predictable and budget-friendly.',
    advantage: '🧾 Predictable billing — easier budgeting for clients.',
  },
  {
    aspect: 'Ordering Process',
    traditional: 'Manual ordering by call or text. Risk of running out or delayed refills.',
    smartRefill: 'Automated scheduling and refill tracking through the app.',
    advantage: '⚙️ No manual ordering — 100% automated and smart delivery.',
  },
  {
    aspect: 'Monitoring Usage',
    traditional: 'No tracking. Businesses often overorder or underorder.',
    smartRefill: 'Real-time monitoring of liters used and refills made.',
    advantage: '📊 Transparent usage data for accounting and cost optimization.',
  },
  {
    aspect: 'Wastage',
    traditional: 'Bottles sometimes unused, misplaced, or lost.',
    smartRefill: 'Liter-based tracking + roll-over feature (2 months).',
    advantage: '🔄 No wastage — unused liters are saved.',
  },
  {
    aspect: 'Scalability',
    traditional: 'Hard to manage for multiple branches.',
    smartRefill: 'Centralized control for all locations via one dashboard.',
    advantage: '🌐 Multi-site management for enterprises.',
  },
  {
    aspect: 'Water Quality & Compliance',
    traditional: 'Quality varies per supplier. No digital record.',
    smartRefill: 'Monitored through Client Portal',
    advantage: '💧 Verified water sources with digital compliance record.',
  },
  {
    aspect: 'Customer Experience',
    traditional: 'Reactive and inconsistent service.',
    smartRefill: 'Automated, proactive, and data-driven service.',
    advantage: '🚀 Modern and hassle-free experience.',
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
          <h1 className="text-2xl font-bold">The Smart Refill Advantage</h1>
          <p className="text-muted-foreground">
            Step 3: A clear comparison against the traditional model.
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

      <div className="container mx-auto px-0">
        <div className="grid md:grid-cols-2 gap-6 items-start rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="relative aspect-video rounded-lg overflow-hidden">
                <Image 
                    src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FSmartRefill_06.png?alt=media&token=7fa3a2b5-5173-4508-bf0c-8324c5d704e2"
                    alt="Smart Refill Advantage"
                    fill
                    className="object-cover"
                    data-ai-hint="business meeting"
                />
            </div>

            <Card className="shadow-md">
                <CardContent className="p-0">
                <Accordion type="single" collapsible defaultValue={comparisonData[0].aspect}>
                    {comparisonData.map((item) => (
                    <AccordionItem value={item.aspect} key={item.aspect}>
                        <AccordionTrigger className="px-6 text-base font-semibold">
                        {item.aspect}
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                        <div className="grid gap-4 pt-4">
                            <div className="space-y-2 rounded-lg bg-background p-4 border">
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-5 w-5 text-destructive" />
                                    <h4 className="font-semibold text-muted-foreground">Traditional Model</h4>
                                </div>
                                <p className="text-sm pl-7">{item.traditional}</p>
                            </div>
                            <div className="space-y-2 rounded-lg bg-primary/10 p-4 border border-primary/20">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-primary" />
                                    <h4 className="font-semibold text-primary">Smart Refill Model</h4>
                                </div>
                                <p className="text-sm pl-7">{item.smartRefill}</p>
                                <div className="mt-2 pl-7">
                                    <p className="text-sm font-semibold text-primary">{item.advantage}</p>
                                </div>
                            </div>
                        </div>
                        </AccordionContent>
                    </AccordionItem>
                    ))}
                </Accordion>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
