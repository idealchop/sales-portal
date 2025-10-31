

'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Download, Send, Rocket, Computer, CalendarClock, RotateCw, AreaChart, Thermometer, Wrench, CircleHelp, Phone, Users, GlassWater, Package, CheckCircle, CalendarCheck, Ship, Save } from 'lucide-react';
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
    id: 'emergency-support',
    name: '24/7 Emergency Support',
    description: 'On-call assistance for urgent refills or technical issues',
    fee: '₱750 / month',
    feeValue: 750,
  },
  {
    id: 'weekly-sanitation',
    name: 'Weekly Sanitation',
    description: 'Increase sanitation visits to weekly for high-traffic areas.',
    fee: '₱1200 / month',
    feeValue: 1200,
  },
  {
    id: 'multi-location',
    name: 'Multi-Location Coordination',
    description: 'Centralized scheduling, billing, and delivery management for multiple branches',
    fee: 'Custom',
    feeValue: 0,
  },
];

const additionalDispenserCost = 300;

function PreviewDialog({ 
    totalAmount,
    billingCycleLabel,
    discount,
    basePrice,
    selectedAddons,
    additionalDispensers
}: { 
    totalAmount: string,
    billingCycleLabel: string,
    discount: number,
    basePrice: number,
    selectedAddons: { [key: string]: boolean },
    additionalDispensers: number,
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

    const addonsCost = addons.reduce((total, addon) => {
        return total + (selectedAddons[addon.id] ? addon.feeValue : 0);
    }, 0);
    
    const dispensersCost = additionalDispensers * additionalDispenserCost;
    const subtotal = 7500 + addonsCost + dispensersCost;

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
                            {addons.map((addon) => (
                                selectedAddons[addon.id] && (
                                    <div key={addon.id} className="flex justify-between items-center">
                                        <span className="text-muted-foreground">{addon.name}</span>
                                        <span className="font-semibold">{currencyFormatter.format(addon.feeValue)}</span>
                                    </div>
                                )
                            ))}
                            {additionalDispensers > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Additional Dispensers ({additionalDispensers}x)</span>
                                    <span className="font-semibold">{currencyFormatter.format(dispensersCost)}</span>
                                </div>
                            )}
                             <Separator className="my-2" />
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-semibold">{currencyFormatter.format(subtotal)}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Billing Cycle Discount ({billingCycleLabel})</span>
                                <span className="font-semibold text-primary">-{currencyFormatter.format(subtotal * discount)}</span>
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

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-semibold">{value}</p>
        </div>
      </div>
    );
}

function TimelineItem({ icon, title, description, isLast = false }: { icon: React.ReactNode, title: string, description: string, isLast?: boolean }) {
    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {icon}
                </div>
                {!isLast && <div className="w-px flex-1 bg-border" />}
            </div>
            <div>
                <h4 className="font-semibold">{title}</h4>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    )
}


export default function ContractPage() {
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState(billingCycles[0].value);
  const [selectedAddons, setSelectedAddons] = useState<{ [key: string]: boolean }>({
    'emergency-support': false,
    'weekly-sanitation': false,
    'multi-location': false,
  });
  const [additionalDispensers, setAdditionalDispensers] = useState(0);

  const handleAddonToggle = (addonId: string) => {
    setSelectedAddons(prev => ({...prev, [addonId]: !prev[addonId] }));
  }

  const { totalAmount, discount, billingCycleLabel, basePrice } = useMemo(() => {
    const proPlanCost = 7500;
    const addonsCost = addons.reduce((total, addon) => {
        return total + (selectedAddons[addon.id] ? addon.feeValue : 0);
    }, 0);
    const dispensersCost = additionalDispensers * additionalDispenserCost;

    const currentBasePrice = proPlanCost + addonsCost + dispensersCost;
    const selectedCycle = billingCycles.find(c => c.value === billingCycle) || billingCycles[0];
    const discountAmount = currentBasePrice * selectedCycle.discount;
    const finalAmount = currentBasePrice - discountAmount;
    
    return {
        totalAmount: new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(finalAmount),
        discount: selectedCycle.discount,
        billingCycleLabel: selectedCycle.label,
        basePrice: currentBasePrice,
    }
  }, [billingCycle, selectedAddons, additionalDispensers]);

  const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

  const handleSaveProposal = () => {
    toast({
        title: "Proposal Saved!",
        description: "Your proposal has been saved as a draft.",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review &amp; Sign</h1>
          <p className="text-muted-foreground">
            Step 4: Review inclusions, add-ons, and sign the agreement.
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/dashboard/proposals/new/payment">Previous</Link>
            </Button>
            <Button onClick={handleSaveProposal}>
                <Save className="mr-2 h-4 w-4" />
                Save Proposal
            </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">

        <Card>
            <CardHeader>
                <CardTitle>Plan Summary: Pro Plan</CardTitle>
                <CardDescription>
                    A summary of the selected subscription plan details.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                 <DetailItem icon={<GlassWater className="h-5 w-5" />} label="Total Liters" value="5,000 L" />
                 <DetailItem icon={<Users className="h-5 w-5" />} label="Employees Covered" value="50 – 75" />
                 <DetailItem icon={<Package className="h-5 w-5" />} label="Free Dispensers" value="2 Units" />
                 <DetailItem icon={<GlassWater className="h-5 w-5" />} label="Est. Bottles" value="≈ 263 bottles" />
            </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Included in Every Plan</CardTitle>
                        <CardDescription>
                            Core services that come with every Smart Refill subscription.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 sm:grid-cols-2">
                        {inclusions.slice(0, 8).map((item) => (
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
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Distribution &amp; Operation Timeline</CardTitle>
                    <CardDescription>Key milestones for service activation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <TimelineItem 
                        icon={<CheckCircle className="h-4 w-4" />}
                        title="Account Activation"
                        description="Client portal is set up within 24 hours of signing and making payment."
                    />
                    <TimelineItem 
                        icon={<CalendarCheck className="h-4 w-4" />}
                        title="Onboarding &amp; Scheduling"
                        description="Initial delivery schedule set within 48 hours."
                    />
                     <TimelineItem 
                        icon={<Ship className="h-4 w-4" />}
                        title="First Delivery"
                        description="Equipment and first batch of water arrive in 3-5 business days."
                        isLast
                    />
                </CardContent>
            </Card>
        </div>


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
                        <Checkbox 
                            id={addon.id} 
                            onCheckedChange={() => handleAddonToggle(addon.id)}
                            checked={selectedAddons[addon.id]}
                            disabled={addon.fee === 'Custom'}
                        />
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
                <CardTitle>Summary &amp; Final Amount</CardTitle>
                <CardDescription>Review the final costs before proceeding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pro Plan (Monthly)</span>
                    <span className="font-semibold">₱7,500.00</span>
                </div>
                 {addons.map(addon => selectedAddons[addon.id] && (
                    <div key={addon.id} className="flex justify-between items-center">
                        <span className="text-muted-foreground">{addon.name}</span>
                        <span className="font-semibold">{currencyFormatter.format(addon.feeValue)}</span>
                    </div>
                 ))}
                 {additionalDispensers > 0 && (
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Additional Dispensers ({additionalDispensers}x)</span>
                        <span className="font-semibold">{currencyFormatter.format(additionalDispensers * additionalDispenserCost)}</span>
                    </div>
                 )}
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
                <div className='space-y-2'>
                    <Label htmlFor="additional-dispensers">Additional Dispensers ({currencyFormatter.format(additionalDispenserCost)}/mo)</Label>
                    <Input 
                        id="additional-dispensers"
                        type="number"
                        min="0"
                        value={additionalDispensers}
                        onChange={(e) => setAdditionalDispensers(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder="e.g., 1"
                    />
                </div>
                 <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Due</span>
                    <span>{totalAmount}</span>
                </div>
            </CardContent>
            <CardFooter className="justify-end">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>Review &amp; Sign</Button>
                    </DialogTrigger>
                    <PreviewDialog 
                        totalAmount={totalAmount}
                        billingCycleLabel={billingCycleLabel}
                        discount={discount}
                        basePrice={basePrice}
                        selectedAddons={selectedAddons}
                        additionalDispensers={additionalDispensers}
                    />
                </Dialog>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}

    

    