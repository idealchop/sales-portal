
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
import { useRef, useState, useMemo } from 'react';
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
import { Download, Send, CheckCircle, Rocket, Computer, CalendarClock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Logo } from '@/components/logo';
import { ContractText } from '@/components/contract-text';

const billingCycles = [
  { value: 'monthly', label: 'Monthly', discount: 0 },
  { value: 'quarterly', label: 'Quarterly', discount: 0.03 },
  { value: 'semi-annually', label: 'Semi-Annually', discount: 0.05 },
  { value: 'annually', label: 'Annually', discount: 0.10 },
];

function PreviewDialog({ 
    clientName, 
    clientCompany, 
    planName, 
    totalAmount,
    billingCycleLabel,
    discount,
    basePrice
}: { 
    clientName: string, 
    clientCompany: string, 
    planName: string, 
    totalAmount: string,
    billingCycleLabel: string,
    discount: number,
    basePrice: number
}) {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const proposalId = useMemo(() => `SR${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`, []);

    return (
        <DialogContent className="sm:max-w-4xl">
            <ScrollArea className="h-[80vh] pr-6">
                <div className="space-y-6 p-2">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <Logo className="h-12 w-12" />
                            <div>
                                <h2 className="text-2xl font-bold text-primary">Smart Refill</h2>
                                <p className="text-muted-foreground">Sales Illustration</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className="font-mono text-sm text-muted-foreground">{proposalId}</p>
                        </div>
                    </div>
                    
                    <Separator />

                    <Card>
                        <CardHeader>
                            <CardTitle>For the Proposed Client</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                                <span className="text-muted-foreground">Name:</span>
                                <span className="font-semibold">{clientName || "N/A"}</span>
                            </div>
                             <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                                <span className="text-muted-foreground">Date:</span>
                                <span className="font-semibold">{today}</span>
                            </div>
                             <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                                <span className="text-muted-foreground">Company:</span>
                                <span className="font-semibold">{clientCompany || "N/A"}</span>
                            </div>
                           <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                                <span className="text-muted-foreground">Plan:</span>
                                <span className="font-semibold">{planName}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-muted-foreground">
                                Thank you for considering Smart Refill for your business's water supply needs. We are excited to present this proposal for our automated and reliable water refill service. This document outlines the plan details, benefits, and the terms of our partnership.
                            </p>
                            <p className="text-muted-foreground mt-4">
                                At Smart Refill, we are committed to providing a seamless, compliant, and cost-effective solution, so you can focus on what matters most—running your business.
                            </p>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle>Cost Breakdown</CardTitle>
                            <CardDescription>Itemized list of all costs associated with this proposal.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Pro Plan (Monthly)</span>
                                <span className="font-semibold">{currencyFormatter.format(7500)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Express Delivery (Add-on)</span>
                                <span className="font-semibold">{currencyFormatter.format(500)}</span>
                            </div>
                             <Separator className="my-2" />
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-semibold">{currencyFormatter.format(basePrice)}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Billing Cycle Discount ({billingCycleLabel})</span>
                                <span className="font-semibold text-primary">-{currencyFormatter.format(basePrice * discount)}</span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between items-center font-bold text-lg">
                                <span>Total Amount Due</span>
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
            <DialogFooter className="gap-2 sm:justify-end">
                <DialogTrigger asChild>
                    <Button type="button" variant="outline">Close</Button>
                </DialogTrigger>
                <Button type="button"><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
                <Button type="button"><Send className="mr-2 h-4 w-4" /> Send to Client</Button>
            </DialogFooter>
        </DialogContent>
    )
}

function ServiceDetailItem({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="pt-1">{icon}</div>
            <div className="text-sm text-muted-foreground">{children}</div>
        </div>
    );
}

export default function ContractPage() {
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [billingCycle, setBillingCycle] = useState(billingCycles[0].value);
  const { toast } = useToast();

  const basePrice = 8000; // Pro Plan (7500) + Express Delivery (500)

  const { totalAmount, discount, billingCycleLabel } = useMemo(() => {
    const selectedCycle = billingCycles.find(c => c.value === billingCycle) || billingCycles[0];
    const discountAmount = basePrice * selectedCycle.discount;
    const finalAmount = basePrice - discountAmount;
    return {
        totalAmount: new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(finalAmount),
        discount: selectedCycle.discount,
        billingCycleLabel: selectedCycle.label,
    }
  }, [billingCycle, basePrice]);

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
                totalAmount={totalAmount}
                billingCycleLabel={billingCycleLabel}
                discount={discount}
                basePrice={basePrice}
            />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <Card>
                 <CardHeader>
                    <CardTitle>Service Details</CardTitle>
                    <CardDescription>A final summary of the services, inclusions, and add-ons for the Pro Plan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-foreground mb-4">Key Inclusions</h3>
                        <div className="space-y-3">
                             <ServiceDetailItem icon={<Computer className="h-5 w-5 text-primary" />}>
                                <strong>Smart Client Portal:</strong> Monitor consumption, providers, deliveries, and payments in real time.
                            </ServiceDetailItem>
                             <ServiceDetailItem icon={<CalendarClock className="h-5 w-5 text-primary" />}>
                                <strong>Automated Scheduling & Delivery:</strong> No manual ordering; Smart Refill handles refills automatically.
                            </ServiceDetailItem>
                            <ServiceDetailItem icon={<CheckCircle className="h-5 w-5 text-primary" />}>
                                <strong>Guaranteed Water Compliance:</strong> All partner stations meet strict sanitation and quality standards.
                            </ServiceDetailItem>
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-foreground mb-4">Selected Add-ons</h3>
                         <div className="space-y-3">
                             <ServiceDetailItem icon={<Rocket className="h-5 w-5 text-primary" />}>
                                <strong>Express Delivery Upgrade:</strong> Priority delivery during peak hours for uninterrupted operations.
                            </ServiceDetailItem>
                        </div>
                    </div>
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
                    <div className='space-y-2'>
                        <Label htmlFor="billing-cycle">Payment Schedule</Label>
                         <Select value={billingCycle} onValueChange={setBillingCycle}>
                            <SelectTrigger id="billing-cycle">
                                <SelectValue placeholder="Select a cycle" />
                            </SelectTrigger>
                            <SelectContent>
                                {billingCycles.map((cycle) => (
                                    <SelectItem key={cycle.value} value={cycle.value}>
                                        {cycle.label} ({cycle.discount * 100}% discount)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total Due</span>
                        <span>{totalAmount}</span>
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
                             <Input placeholder="Date" value={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} readOnly />
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
