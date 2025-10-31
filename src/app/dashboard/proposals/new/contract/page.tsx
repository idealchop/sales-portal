
'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignaturePad, type SignaturePadRef } from '@/components/signature-pad';
import { useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from '@/components/ui/scroll-area';

function ContractText() {
    return (
        <>
            <ContractSection title="1. Purpose">
                <p>
                  This Agreement governs the prepaid water supply subscription service delivered through Smart Refill’s automated system and partner refill stations.
                </p>
            </ContractSection>

            <ContractSection title="2. Service Overview">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Scheduled and automated water deliveries through verified local partner refill stations.</li>
                  <li>Water compliant with DOH, DENR, and FDA standards.</li>
                  <li>Usage tracking, scheduling, and roll-over management via the Smart Refill platform.</li>
                  <li>Monthly consumption and compliance reports for operational monitoring and transparency.</li>
                </ul>
            </ContractSection>

            <ContractSection title="3. Subscription Plans">
                <ul className="list-disc pl-5 space-y-1">
                    <li>Clients may subscribe under any active Smart Refill™ plan (Micro, Starter, Pro, Business, Enterprise+, or Unlimited+).</li>
                    <li>Each plan includes a defined number of liters per month, optional roll-over (2 months), and a fixed prepaid fee.</li>
                    <li>Additional liters beyond plan limits are billed at the plan’s add-on rate.</li>
                </ul>
            </ContractSection>

            <ContractSection title="4. Delivery & Refills">
                <ul className="list-disc pl-5 space-y-1">
                    <li>Water is delivered automatically based on usage data or refill schedules set in the Smart Refill™ system.</li>
                    <li>Deliveries are performed by accredited local partner refill stations under the Smart Refill™ network.</li>
                    <li>Delivery schedules may be adjusted by Smart Refill™ for operational efficiency and service reliability.</li>
                </ul>
            </ContractSection>
            
            <ContractSection title="5. Equipment Use">
                <ul className="list-disc pl-5 space-y-1">
                    <li>Each plan includes free use of dispensers and bottles (quantity based on plan tier).</li>
                    <li>Equipment remains the property of River Tech Group, Inc.</li>
                    <li>If the Client exceeds included equipment limits, additional units may be provided as rentals.</li>
                    <li>The Client must maintain equipment in good condition and return or replace damaged items.</li>
                </ul>
            </ContractSection>

            <ContractSection title="6. Payment Terms">
                <ul className="list-disc pl-5 space-y-1">
                    <li>Subscriptions are prepaid monthly.</li>
                    <li>Payment covers the included liter allocation and any applicable service fees.</li>
                    <li>Unused liters roll over for up to two (2) consecutive months, after which they expire.</li>
                    <li>Payments are non-refundable after activation.</li>
                </ul>
            </ContractSection>

            <ContractSection title="7. Quality & Compliance">
                <p>
                    Smart Refill™ ensures all partner stations meet government-approved water safety and sanitation standards.
                </p>
                <p>
                    Periodic sampling and compliance monitoring are conducted to maintain quality assurance.
                </p>
            </ContractSection>

             <ContractSection title="8. Liability & Health Safety">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-foreground">1. Water Quality Assurance</h4>
                        <p>River Tech Group, Inc., through its Smart Refill™ network, ensures that all partner refill stations operate with valid permits and comply with the latest DOH, DENR, and FDA standards for potable water.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">2. Health-Related Incidents</h4>
                        <p>In the unlikely event of a verified contamination or water-borne health issue directly attributable to the supplied water, Smart Refill™ shall conduct an immediate quality investigation, replace the affected water volume at no additional cost, and cooperate with local health authorities.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">3. Limitation of Liability</h4>
                        <p>Smart Refill™ and River Tech Group, Inc. shall not be liable for issues resulting from improper storage, handling, or dispensing by the Client. The Provider’s total liability shall not exceed the total subscription amount paid by the Client within the past three (3) months.</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-foreground">4. Client Responsibilities</h4>
                        <p>The Client agrees to maintain clean and safe dispenser locations and promptly report any suspected quality issue.</p>
                    </div>
                </div>
            </ContractSection>

            <ContractSection title="9. Subscription Renewal, Suspension, and Termination">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-foreground">9.1 Auto-Renewal</h4>
                        <p>Subscriptions automatically renew unless cancelled by the Client at least 30 days prior to renewal.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">9.2 Cancellation by Client</h4>
                        <p>The Client may cancel with 30 days written notice. Prepaid amounts are non-refundable, and equipment must be returned in good condition.</p>
                    </div>
                    <div>
                         <h4 className="font-semibold text-foreground">9.3 Suspension by Smart Refill™</h4>
                        <p>Services may be suspended for non-payment, misuse, or breach of standards.</p>
                    </div>
                    <div>
                         <h4 className="font-semibold text-foreground">9.4 Termination by Smart Refill™</h4>
                        <p>Smart Refill™ may terminate the agreement for cause (e.g., material breach) or without cause with 30 days’ notice.</p>
                    </div>
                </div>
            </ContractSection>
            
            <ContractSection title="10. Data and Monitoring">
                <p>Operational data is used for service improvement and compliance reporting, in accordance with the Data Privacy Act of 2012.</p>
            </ContractSection>

             <ContractSection title="11. Trademarks & Ownership">
                <p>Smart Refill™ is a registered trademark of River Tech Group, Inc. All intellectual property remains with the Provider.</p>
            </ContractSection>

            <ContractSection title="12. Governing Law">
                <p>This Agreement is governed by the laws of the Republic of the Philippines.</p>
            </ContractSection>
        </>
    )
}

function ContractSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="space-y-4 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function PreviewDialog({ 
    clientName, 
    clientCompany, 
    planName, 
    totalAmount 
}: { 
    clientName: string, 
    clientCompany: string, 
    planName: string, 
    totalAmount: string 
}) {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Proposal & Contract Preview</DialogTitle>
                <DialogDescription>
                    Review the complete details of the proposal before finalizing.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[70vh] pr-6">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Client & Proposal Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Client Name</p>
                                    <p className="font-semibold">{clientName || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Company</p>
                                    <p className="font-semibold">{clientCompany || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Date</p>
                                    <p className="font-semibold">{today}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Selected Plan</p>
                                    <p className="font-semibold">{planName}</p>
                                </div>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center font-bold text-lg">
                                <span>Total Amount</span>
                                <span>{totalAmount}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Smart Refill™ Water Supply Subscription Agreement</CardTitle>
                             <CardDescription>
                                Between: River Tech Group, Inc. (“Provider”) and the Subscriber (“Client”).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <ContractText />
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>
            <DialogFooter>
                <DialogTrigger asChild>
                    <Button type="button">Close</Button>
                </DialogTrigger>
            </DialogFooter>
        </DialogContent>
    )
}

export default function ContractPage() {
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const { toast } = useToast();

  const handleFinalize = () => {
    const signatureDataUrl = signaturePadRef.current?.getSignatureDataUrl();
    if (signaturePadRef.current?.isEmpty()) {
        toast({
            variant: "destructive",
            title: "Signature Required",
            description: "Please provide a signature before finalizing.",
        });
        return;
    }

    // In a real application, you would send this data to a backend.
    // For this prototype, we'll simulate ID generation.
    const year = new Date().getFullYear().toString().slice(-2);
    const randomNumber = Math.floor(100000 + Math.random() * 900000); // For demonstration
    const clientID = `SC${year}${randomNumber}`;


    toast({
        title: "Contract Finalized!",
        description: `Client ID ${clientID} has been generated. The signed contract has been saved.`,
    });

    // You would typically navigate to a confirmation page or back to the dashboard.
    // router.push('/dashboard/proposals');
  };


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contract & Signature</h1>
          <p className="text-muted-foreground">
            Step 5: Review and sign the agreement.
          </p>
        </div>
        <Dialog>
            <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/dashboard/proposals/new/payment">Previous</Link>
            </Button>
            <DialogTrigger asChild>
                <Button variant="outline">Preview</Button>
            </DialogTrigger>
            <Button onClick={handleFinalize}>Finalize & Send</Button>
            </div>
            <PreviewDialog 
                clientName={clientName} 
                clientCompany={clientCompany}
                planName="Pro Plan"
                totalAmount="₱8,000.00"
            />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Smart Refill™ Water Supply Subscription Agreement</CardTitle>
              <CardDescription>
                Between: River Tech Group, Inc. (“Provider”) and the Subscriber (“Client”).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <ContractText />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Summary & Final Amount</CardTitle>
                    <CardDescription>Review the final costs before signing.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Pro Plan (Monthly)</span>
                        <span className="font-semibold">₱7,500.00</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Express Delivery</span>
                        <span className="font-semibold">₱500.00</span>
                    </div>
                    <Separator />
                     <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total Due</span>
                        <span>₱8,000.00</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Signatures</CardTitle>
                    <CardDescription>Please sign below to finalize the agreement.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="space-y-6 pt-4">
                     <p className="font-semibold text-foreground">Client Representative (Subscriber)</p>
                        <div className="space-y-2">
                            <Label htmlFor="name">Name:</Label>
                            <Input id="name" placeholder="Full Name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company">Company:</Label>
                            <Input id="company" placeholder="Company Name" value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Date:</Label>
                            <div className="w-full border-b pt-8"></div>
                        </div>
                        <div className="space-y-2">
                            <Label>Signature:</Label>
                            <SignaturePad ref={signaturePadRef} />
                        </div>
                   </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
