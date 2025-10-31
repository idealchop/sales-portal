
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
  DialogClose,
} from "@/components/ui/dialog"
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Send, Rocket, Computer, CalendarClock, RotateCw, AreaChart, Thermometer, Wrench, CircleHelp, Phone } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Logo } from '@/components/logo';
import { ContractText } from '@/components/contract-text';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const billingCycles = [
  { value: 'monthly', label: 'Monthly', discount: 0 },
  { value: 'quarterly', label: 'Quarterly', discount: 0.03 },
  { value: 'semi-annually', label: 'Semi-Annually', discount: 0.05 },
  { value: 'annually', label: 'Annually', discount: 0.10 },
];

const inclusions = [
    {
        icon: <Computer className="h-5 w-5 text-primary" />,
        title: 'Smart Client Portal',
        description: 'Monitor consumption, providers, deliveries, and payments in real time.',
    },
    {
        icon: <CalendarClock className="h-5 w-5 text-primary" />,
        title: 'Automated Scheduling & Delivery',
        description: 'No manual ordering; Smart Refill handles refills automatically.',
    },
    {
        icon: <RotateCw className="h-5 w-5 text-primary" />,
        title: 'Roll-Over Liters',
        description: 'Unused liters carry over to the next cycle.',
    },
    {
        icon: <AreaChart className="h-5 w-5 text-primary" />,
        title: 'Transparent Tracking',
        description: 'Full visibility for operations and accounting.',
    },
    {
        icon: <Thermometer className="h-5 w-5 text-primary" />,
        title: 'Free Dispensers, Bottles & Sanitary Items',
        description: 'Included based on your plan.',
    },
    {
        icon: <Wrench className="h-5 w-5 text-primary" />,
        title: 'Monthly Sanitation Visit',
        description: 'Regular cleaning and compliance check for your dispensers.',
    },
    {
        icon: <CircleHelp className="h-5 w-5 text-primary" />,
        title: 'Guaranteed Water Compliance',
        description: 'All partner stations meet strict sanitation and quality standards.',
    },
    {
        icon: <Phone className="h-5 w-5 text-primary" />,
        title: 'Customer Support',
        description: 'Assistance available for any service or delivery concerns.',
    },
    {
        icon: <Rocket className="h-5 w-5 text-primary" />,
        title: 'Custom & Scalable Plans',
        description: 'Adjust liters, branches, and schedules as your business grows.',
    },
];

const addons = [
  {
    id: 'express-delivery',
    name: 'Express Delivery Upgrade',
    description: 'Priority delivery during peak hours for uninterrupted operations',
    fee: '₱500 / month',
  },
  {
    id: 'emergency-support',
    name: '24/7 Emergency Support',
    description: 'On-call assistance for urgent refills or technical issues',
    fee: '₱750 / month',
  },
  {
    id: 'multi-location',
    name: 'Multi-Location Coordination',
    description: 'Centralized scheduling, billing, and delivery management for multiple branches',
    fee: 'Custom',
  },
];


function PreviewDialog({ 
    totalAmount,
    billingCycleLabel,
    discount,
    basePrice
}: { 
    totalAmount: string,
    billingCycleLabel: string,
    discount: number,
    basePrice: number
}) {
    const signaturePadRef = useRef<SignaturePadRef>(null);
    const [clientName, setClientName] = useState('');
    const [clientCompany, setClientCompany] = useState('');
    const { toast } = useToast();
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const proposalId = useMemo(() => `SR${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`, []);

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

        if (!clientName || !clientCompany) {
            toast({
                variant: "destructive",
                title: "Client Information Required",
                description: "Please enter the client's name and company.",
            });
            return;
        }

        const year = new Date().getFullYear().toString().slice(-2);
        const randomNumber = Math.floor(100000 + Math.random() * 900000); 
        const clientID = `SC${year}${randomNumber}`;


        toast({
            title: "Contract Finalized!",
            description: `Client ID ${clientID} has been generated. The signed contract has been saved.`,
        });
    };

    return (
        <DialogContent className="sm:max-w-5xl">
            <ScrollArea className="h-[85vh] pr-6">
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
                                <span className="font-semibold">Pro Plan</span>
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

                    <Card>
                        <CardHeader>
                            <CardTitle>Signatures</CardTitle>
                            <CardDescription>Please sign below to finalize the agreement.</CardDescription>
                        </CardHeader>
                        <CardContent>
                        <div className="space-y-6 pt-4">
                            <p className="font-semibold text-foreground">Client Representative (Subscriber)</p>
                                <div className="space-y-2">
                                    <Label htmlFor="name-preview">Name:</Label>
                                    <Input id="name-preview" placeholder="Full Name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="company-preview">Company:</Label>
                                    <Input id="company-preview" placeholder="Company Name" value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Date:</Label>
                                    <Input placeholder="Date" value={today} readOnly />
                                </div>
                                <div className="space-y-2">
                                    <Label>Signature:</Label>
                                    <SignaturePad ref={signaturePadRef} />
                                </div>
                        </div>
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>
            <DialogFooter className="gap-2 sm:justify-end border-t pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Close</Button>
                </DialogClose>
                <Button type="button"><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
                <Button type="button" onClick={handleFinalize}><Send className="mr-2 h-4 w-4" /> Finalize & Send</Button>
            </DialogFooter>
        </DialogContent>
    )
}

export default function ContractPage() {
  const [billingCycle, setBillingCycle] = useState(billingCycles[0].value);
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review & Sign</h1>
          <p className="text-muted-foreground">
            Step 4: Review inclusions, add-ons, and sign the agreement.
          </p>
        </div>
        <Dialog>
            <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/dashboard/proposals/new/payment">Previous</Link>
            </Button>
            <DialogTrigger asChild>
                <Button>Review & Sign</Button>
            </DialogTrigger>
            </div>
            <PreviewDialog 
                totalAmount={totalAmount}
                billingCycleLabel={billingCycleLabel}
                discount={discount}
                basePrice={basePrice}
            />
        </Dialog>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Included in Every Plan</CardTitle>
                <CardDescription>
                    Smart Refill gives your business a complete, automated water operations system — designed for convenience, compliance, and continuous supply.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
                {inclusions.map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                    <div>{item.icon}</div>
                    <div>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">
                        {item.description}
                    </p>
                    </div>
                </div>
                ))}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Optional Add-Ons</CardTitle>
                <CardDescription>
                Enhance your Smart Refill experience with premium service options designed to make water operations even faster, safer, and more efficient.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Add-On</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Monthly Fee</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {addons.map((addon) => (
                    <TableRow key={addon.id}>
                        <TableCell>
                        <Checkbox id={addon.id} />
                        </TableCell>
                        <TableCell>
                        <Label htmlFor={addon.id} className="font-semibold">{addon.name}</Label>
                        </TableCell>
                        <TableCell>{addon.description}</TableCell>
                        <TableCell className="text-right">{addon.fee}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
        </Card>
        
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
      </div>
    </div>
  );
}

    

    