

'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { useRef, useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Send, Rocket, Computer, CalendarClock, RotateCw, AreaChart, Thermometer, Wrench, CircleHelp, Phone, Users, Waves, Package, CheckCircle, CalendarCheck, Ship, Bot, Save, HeartPulse, Coffee, Building, Car, RefreshCcw, CreditCard } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Logo } from '@/components/logo';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import Image from 'next/image';
import { allPlans, deliveryFrequencies, gallonRotationData } from '../plans/page';
import { PaymentMethods } from '@/components/payment-methods';

const billingCycles = [
  { value: 'monthly', label: 'Monthly', discount: 0, multiplier: 1 },
  { value: 'quarterly', label: 'Quarterly', discount: 0.03, multiplier: 3 },
  { value: 'semi-annually', label: 'Semi-Annually', discount: 0.05, multiplier: 6 },
  { value: 'annually', label: 'Annually', discount: 0.10, multiplier: 12 },
];

const billingOptions = [
  {
    cycle: 'Monthly',
    frequency: 'Pay every month',
    benefits: 'Standard plan benefits and monthly roll-over',
  },
  {
    cycle: 'Quarterly (every 3 months)',
    frequency: 'Prepaid every quarter',
    benefits: '3% discount on total plan cost',
  },
  {
    cycle: 'Semi-Annual (every 6 months)',
    frequency: 'Prepaid every 6 months',
    benefits: '5% discount + extended roll-over to 3 months',
  },
  {
    cycle: 'Annual (12 months)',
    frequency: 'Prepaid annually',
    benefits: '10% discount + free dispenser servicing + priority delivery scheduling',
  },
];


const addons = [
  {
    id: 'weekly-sanitation',
    name: 'Weekly Sanitation',
    description: 'Increase sanitation visits to weekly for high-traffic areas.',
    fee: '₱1200 / month',
    feeValue: 1200,
    type: 'checkbox',
  },
  {
    id: 'additional-dispensers',
    name: 'Additional Dispensers',
    description: 'Rent extra dispensers for more convenience.',
    fee: '₱250 / month / unit',
    feeValue: 250,
    type: 'quantity',
  },
  {
    id: 'additional-liters',
    name: 'Additional Liters',
    description: 'Pre-purchase extra liters for the upcoming cycle.',
    fee: '₱3.00 / liter',
    feeValue: 3,
    type: 'slider',
  }
];

const additionalDispenserCost = 250;
const additionalLiterCost = 3;

const inclusions = [
    {
        icon: <Computer className="h-5 w-5 text-primary" />,
        title: 'Smart Client Portal',
        description: 'Monitor consumption, compliance, water providers, and payments in real time.',
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
        icon: <Thermometer className="h-5 w-5 text-primary" />,
        title: 'Free Dispensers, Gallons & Sanitary Items',
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

const perks = [
    {
        icon: <HeartPulse className="h-8 w-8 text-muted-foreground" />,
        partner: 'HealthFirst Clinic',
        description: 'Multi-specialty medical clinics.',
        benefit: '15% discount on annual physical exams for all employees.',
    },
    {
        icon: <Coffee className="h-8 w-8 text-muted-foreground" />,
        partner: 'The Daily Grind Cafe',
        description: 'Specialty coffee and pastries.',
        benefit: '10% off on all bulk coffee bean orders for the office pantry.',
    },
    {
        icon: <Building className="h-8 w-8 text-muted-foreground" />,
        partner: 'FlexiSpace Co-Working',
        description: 'Modern and flexible office solutions.',
        benefit: 'One free day pass per month at any FlexiSpace location nationwide.',
    },
    {
        icon: <Car className="h-8 w-8 text-muted-foreground" />,
        partner: 'EcoDrive Car Service',
        description: 'Eco-friendly car wash and detailing.',
        benefit: '20% discount on all corporate car wash and detailing services.',
    }
]

export function ContractSection({
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

export function ContractText() {
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
                    <li>Each plan includes free use of dispensers and gallons (quantity based on plan tier).</li>
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

function PreviewDialog({ 
    totalAmount,
    billingCycleLabel,
    discount,
    basePrice,
    selectedAddons,
    additionalDispensers,
    additionalLiters,
    plan,
    finalPlan,
    clientName,
    clientCompany
}: { 
    totalAmount: string,
    billingCycleLabel: string,
    discount: number,
    basePrice: number,
    selectedAddons: { [key: string]: boolean },
    additionalDispensers: number,
    additionalLiters: number,
    plan: any,
    finalPlan: any,
    clientName: string,
    clientCompany: string,
}) {
    const signaturePadRef = useRef<SignaturePadRef>(null);
    const { toast } = useToast();
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const proposalId = useMemo(() => `SR${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`, []);
    
    const clientID = useMemo(() => {
        const year = new Date().getFullYear().toString().slice(-2);
        const randomNumber = Math.floor(100000 + Math.random() * 900000); 
        return `SC${year}${randomNumber}`;
    }, []);

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
                description: "Client information is missing from the proposal.",
            });
            return;
        }

        toast({
            title: "Contract Finalized!",
            description: `Client ID ${clientID} has been generated. The signed contract has been saved.`,
        });
    };

    const planBaseCost = parseFloat(finalPlan.monthlyFee.replace(/[^0-9.-]+/g, ''));
    const addonsCost = addons.reduce((total, addon) => {
        if (addon.type === 'checkbox') {
             return total + (selectedAddons[addon.id] ? addon.feeValue : 0);
        }
        return total;
    }, 0);
    
    const dispensersCost = additionalDispensers * additionalDispenserCost;
    const litersCost = additionalLiters * additionalLiterCost;
    const subtotal = planBaseCost + addonsCost + dispensersCost + litersCost;

    const summaryTitle = finalPlan.name.includes("Plan") ? finalPlan.name : `${finalPlan.name} Plan`;

    const selectedCycle = billingCycles.find(c => c.label === billingCycleLabel) || billingCycles[0];
    const totalBeforeDiscount = subtotal * selectedCycle.multiplier;
    const discountValue = totalBeforeDiscount * discount;

    const baseLiters = plan ? parseInt(plan.liters.replace(/[^0-9]/g, '')) : 0;
    const freeLiters = baseLiters * 0.2;
    const totalLitersValue = (baseLiters + freeLiters + additionalLiters) * selectedCycle.multiplier;
    
    const distributionPlan = useMemo(() => {
        if (totalLitersValue === 0) return [];
        
        const litersPerGallon = 19;
        let deliveriesPerWeek = 1;
        const freq = finalPlan.refillFrequency.toLowerCase();
        
        if (freq.includes('daily')) {
            deliveriesPerWeek = 7;
        } else if (freq.includes('/week')) {
            const range = freq.split('/')[0].split('–').map(s => parseInt(s.trim()));
            deliveriesPerWeek = Math.max(...range);
        } else {
             // Handle cases like "1-2/day" or "continuous" if needed, for now default to a reasonable number or based on another logic.
             // For simplicity, let's assume a default for unhandled cases.
             const deliveriesMatch = freq.match(/(\d+)/);
             if (deliveriesMatch) {
                deliveriesPerWeek = parseInt(deliveriesMatch[0], 10);
             }
        }
        
        const totalDeliveriesPerMonth = deliveriesPerWeek * 4;
        if (totalDeliveriesPerMonth === 0) return [];
        
        const totalGallonsPerMonth = Math.ceil(totalLitersValue / selectedCycle.multiplier / litersPerGallon);
        const gallonsPerDelivery = Math.floor(totalGallonsPerMonth / totalDeliveriesPerMonth * selectedCycle.multiplier);
        let remainingGallons = totalGallonsPerMonth % totalDeliveriesPerMonth;
        
        const weeklyDistribution: {week: string, deliveryNumber: string, gallons: number, liters: number}[] = [];
        
        for (let week = 1; week <= 4; week++) {
            for (let delivery = 1; delivery <= deliveriesPerWeek; delivery++) {
                 let deliveryGallons = gallonsPerDelivery;
                if (remainingGallons > 0) {
                    deliveryGallons++;
                    remainingGallons--;
                }
                
                if (deliveryGallons > 0) {
                    weeklyDistribution.push({
                        week: `Week ${week}`,
                        deliveryNumber: `Delivery ${delivery}`,
                        gallons: deliveryGallons,
                        liters: deliveryGallons * litersPerGallon,
                    });
                }
            }
        }
        return weeklyDistribution;

    }, [totalLitersValue, finalPlan.refillFrequency, selectedCycle.multiplier]);

    const rotationInfo = gallonRotationData[plan?.id] || gallonRotationData['custom-plan'];


    return (
        <DialogContent className="sm:max-w-5xl">
            <DialogHeader className="sr-only">
                <DialogTitle>Proposal Preview</DialogTitle>
                <DialogDescription>A preview of the sales proposal for the client to review and sign.</DialogDescription>
            </DialogHeader>
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
                             <p className="font-mono text-sm text-muted-foreground">Proposal ID: {proposalId}</p>
                        </div>
                    </div>
                    
                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Client Information</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm">
                                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                                    <span className="text-muted-foreground">Client ID:</span>
                                    <span className="font-semibold font-mono">{clientID}</span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                                    <span className="text-muted-foreground">Name:</span>
                                    <span className="font-semibold">{clientName || "N/A"}</span>
                                </div>
                                 <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                                    <span className="text-muted-foreground">Company:</span>
                                    <span className="font-semibold">{clientCompany || "N/A"}</span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-semibold">{today}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Plan Details: {summaryTitle}</CardTitle>
                            </CardHeader>
                             <CardContent className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Waves className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-muted-foreground">Total Liters</p>
                                        <p className="font-semibold">{finalPlan.liters}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-muted-foreground">Employees</p>
                                        <p className="font-semibold">{finalPlan.employees}</p>
                                    </div>
                                </div>
                                 <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-muted-foreground">Refillable Gallons</p>
                                        <p className="font-semibold">
                                            {rotationInfo.gallons > 0 ? `${rotationInfo.gallons}` : 'Dynamic'}
                                            <span className="text-xs font-normal ml-1">(free)</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RefreshCcw className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-muted-foreground">Refill Frequency</p>
                                        <p className="font-semibold">{finalPlan.refillFrequency}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

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
                                <span className="text-muted-foreground">{summaryTitle} (Monthly Cost)</span>
                                <span className="font-semibold">{currencyFormatter.format(planBaseCost)}</span>
                            </div>
                            {addons.map((addon) => (
                                addon.type === 'checkbox' && selectedAddons[addon.id] && (
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
                            {additionalLiters > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Additional Liters ({additionalLiters} L)</span>
                                    <span className="font-semibold">{currencyFormatter.format(litersCost)}</span>
                                </div>
                            )}
                            <Separator className="my-2" />
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Subtotal (per month)</span>
                                <span className="font-semibold">{currencyFormatter.format(subtotal)}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Included Liters (Monthly)</span>
                                <span className="font-semibold">{baseLiters.toLocaleString()} L</span>
                            </div>
                             <div className="flex justify-between items-center font-medium text-primary">
                                <span>+20% Free Liters</span>
                                <span>+{freeLiters.toLocaleString()} L</span>
                            </div>
                            <Separator className="my-2" />
                             <div className="flex justify-between items-center font-semibold">
                                <span>Total Liters Available (Monthly)</span>
                                <span>{(baseLiters + freeLiters).toLocaleString()} L</span>
                            </div>
                            <Separator className="my-2" />
                            {selectedCycle.multiplier > 1 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Total for {selectedCycle.label} ({currencyFormatter.format(subtotal)} x {selectedCycle.multiplier} mos)</span>
                                    <span className="font-semibold">{currencyFormatter.format(totalBeforeDiscount)}</span>
                                </div>
                            )}
                             <div className="flex justify-between items-center text-primary">
                                <span className="text-muted-foreground">Billing Cycle Discount ({billingCycleLabel}, {discount * 100}%)</span>
                                <span className="font-semibold">-{currencyFormatter.format(discountValue)}</span>
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
                            <CardTitle>Projected Delivery Schedule</CardTitle>
                            <CardDescription>
                                An estimated weekly breakdown of your water deliveries based on your total available liters.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {distributionPlan.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Projected Week</TableHead>
                                            <TableHead>Delivery #</TableHead>
                                            <TableHead>Water Station</TableHead>
                                            <TableHead className="text-center">Gallons to Deliver</TableHead>
                                            <TableHead className="text-right">Liters Delivered</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {distributionPlan.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{item.week}</TableCell>
                                                <TableCell>{item.deliveryNumber}</TableCell>
                                                <TableCell>{finalPlan.stations.startsWith('1') ? 'Station 1' : `Station ${(index % (parseInt(finalPlan.stations[0],10) || 1)) + 1}`}</TableCell>
                                                <TableCell className="text-center">{item.gallons}</TableCell>
                                                <TableCell className="text-right">{item.liters.toLocaleString()} L</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableCaption className="text-left mt-4 text-xs">
                                        * This is a projected delivery schedule. Actual deliveries may be adjusted based on real-time consumption data to ensure you never run out of water.
                                    </TableCaption>
                                </Table>
                            ) : (
                                <p className='text-sm text-muted-foreground'>Delivery schedule will be generated based on consumption.</p>
                            )}
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Gallon Rotation & Handling Guide</CardTitle>
                            <CardDescription>
                                Recommendations for managing your gallon inventory to ensure seamless service.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                <div className="space-y-2">
                                    <Label>Recommended Gallons for Rotation</Label>
                                    <p className="text-3xl font-bold">{rotationInfo.gallons > 0 ? `${rotationInfo.gallons} gallons` : 'Dynamic'}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Handling Notes</Label>
                                    <p className="text-sm text-muted-foreground">{rotationInfo.notes}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>


                     <Card>
                        <CardHeader>
                            <CardTitle>Included in Every Plan</CardTitle>
                             <CardDescription>
                                Every subscription plan includes full access to our growing network of partner perks.
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
                            <CardTitle>Partner Perks</CardTitle>
                            <CardDescription>
                                Enhance your subscription with exclusive benefits from our partners, included with every plan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-8 sm:grid-cols-2">
                           {perks.map((perk) => (
                                <div key={perk.partner} className="flex items-start gap-4">
                                    {perk.icon}
                                    <div className="space-y-1">
                                        <h3 className="font-semibold">{perk.partner}</h3>
                                        <p className="text-sm text-muted-foreground">{perk.description}</p>
                                        <p className="text-sm font-medium text-primary">{perk.benefit}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter>
                             <div className="text-sm text-muted-foreground space-y-2">
                               <p className="font-semibold text-foreground">Terms:</p>
                               <ul className="list-disc list-inside space-y-1">
                                    <li>All employees of the subscribed company are eligible for these perks.</li>
                                    <li>To redeem, employees must present their company ID at partner establishments.</li>
                               </ul>
                            </div>
                        </CardFooter>
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
                        <CardContent className="space-y-4 pt-4">
                            <p className="font-semibold text-foreground">Client Representative (Subscriber)</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name-preview">Name</Label>
                                        <Input id="name-preview" placeholder="Full Name" value={clientName} readOnly />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="company-preview">Company</Label>
                                        <Input id="company-preview" placeholder="Company Name" value={clientCompany} readOnly />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date</Label>
                                        <Input placeholder="Date" value={today} readOnly />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Signature</Label>
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
                <Button type="button" onClick={handleFinalize}><Send className="mr-2 h-4 w-4" /> Finalize &amp; Send</Button>
            </DialogFooter>
        </DialogContent>
    )
}

function TimelineItem({ icon, title, description, isLast = false }: { icon: React.ReactNode; title: string; description: string; isLast?: boolean; }) {
    return (
        <div className="relative flex-1">
            <div className="flex flex-col items-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground mb-2">
                    {icon}
                </div>
                <h4 className="font-semibold text-sm">{title}</h4>
                <p className="text-xs text-muted-foreground mt-1 px-2">{description}</p>
            </div>
            {!isLast && (
                <div className="absolute top-5 left-1/2 w-full -translate-x-1/2">
                    <div className="w-full border-t-2 border-dashed border-border -z-10 absolute top-0 left-full"></div>
                </div>
            )}
        </div>
    );
}

function ContractPageContent() {
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');
  const customLiters = searchParams.get('liters');
  const customCost = searchParams.get('cost');
  const customFreq = searchParams.get('freq');
  const customType = searchParams.get('type');
  const companyName = searchParams.get('companyName') || '';
  const contactName = searchParams.get('contactName') || '';

  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState(billingCycles[0].value);
  const [selectedAddons, setSelectedAddons] = useState<{ [key: string]: boolean }>({
    'weekly-sanitation': false,
  });
  const [additionalDispensers, setAdditionalDispensers] = useState(0);
  const [additionalLiters, setAdditionalLiters] = useState(0);

  const getStations = (liters: number) => {
    if (liters <= 2000) return '1 Station';
    if (liters <= 6000) return '2-3 Stations';
    if (liters <= 25000) return '3-4 Stations';
    return '5+ Stations';
  }

  const getEmployees = (liters: number) => {
    const estimatedEmployees = Math.round(liters / (2 * 22));
    if (estimatedEmployees < 5) return '< 5';
    if (estimatedEmployees > 500) return '500+';
    return `~${Math.round(estimatedEmployees / 10) * 10}`;
  };

  const plan = useMemo(() => {
    let basePlan = allPlans.find(p => p.id === planId);
    if (!basePlan) return null;

    if (planId === 'custom-plan' && customType) {
        let typeName = '';
        if (customType === 'sme') {
            typeName = 'SME';
        } else if (customType === 'commercial') {
            typeName = 'Commercial';
        } else {
            typeName = customType.charAt(0).toUpperCase() + customType.slice(1);
        }
        
        basePlan = {
            ...basePlan,
            name: `Custom ${typeName} Plan`,
        };
    }

    if (customLiters && customCost) {
        const litersNum = parseInt(customLiters);
        basePlan = {
            ...basePlan,
            liters: `${litersNum} L`,
            monthlyFee: `₱${parseFloat(customCost).toLocaleString()}`,
            employees: getEmployees(litersNum),
            stations: getStations(litersNum),
        };
    }
    
    if (customFreq) {
        const freqLabel = deliveryFrequencies.find(f => f.value === parseInt(customFreq))?.label;
        if (freqLabel) {
            basePlan.refillFrequency = freqLabel;
        }
    }

    return basePlan;
  }, [planId, customLiters, customCost, customFreq, customType]);

  const handleAddonToggle = (addonId: string) => {
    setSelectedAddons(prev => ({...prev, [addonId]: !prev[addonId] }));
  }

  const { totalAmount, discount, billingCycleLabel, basePrice, totalLiters } = useMemo(() => {
    const planBaseCost = plan ? parseFloat(plan.monthlyFee.replace(/[^0-9.-]+/g,"")) : 0;
    if (isNaN(planBaseCost)) {
      return { totalAmount: plan?.monthlyFee || 'N/A', discount: 0, billingCycleLabel: 'N/A', basePrice: 0, totalLiters: 0 };
    }

    const addonsCost = addons.reduce((total, addon) => {
        if (addon.type === 'checkbox') {
            return total + (selectedAddons[addon.id] ? addon.feeValue : 0);
        }
        return total;
    }, 0);
    const dispensersCost = additionalDispensers * additionalDispenserCost;
    const litersCost = additionalLiters * additionalLiterCost;

    const monthlyBasePrice = planBaseCost + addonsCost + dispensersCost + litersCost;
    const selectedCycle = billingCycles.find(c => c.value === billingCycle) || billingCycles[0];
    
    const totalBeforeDiscount = monthlyBasePrice * selectedCycle.multiplier;
    const discountAmount = totalBeforeDiscount * selectedCycle.discount;
    const finalAmount = totalBeforeDiscount - discountAmount;
    
    const baseLiters = plan ? parseInt(plan.liters.replace(/[^0-9]/g, '')) : 0;
    const freeLiters = baseLiters * 0.2;
    const monthlyLiters = baseLiters + freeLiters + additionalLiters;
    const totalLitersForCycle = monthlyLiters * selectedCycle.multiplier;
    
    return {
        totalAmount: new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(finalAmount),
        discount: selectedCycle.discount,
        billingCycleLabel: selectedCycle.label,
        basePrice: monthlyBasePrice,
        totalLiters: totalLitersForCycle,
    }
  }, [plan, billingCycle, selectedAddons, additionalDispensers, additionalLiters]);
  
  const finalPlan = useMemo(() => {
    if (!plan) return null;
    const baseLiters = parseInt(plan.liters.replace(/[^0-9]/g, ''));
    const freeLiters = baseLiters * 0.2;
    const finalLiters = baseLiters + freeLiters + additionalLiters;
    const planInclusions = plan.id === 'enterprise-overflow' 
        ? ['Pay only for what you use'] 
        : (plan.inclusions && plan.inclusions.length > 0 ? [plan.inclusions[0]] : []);

    return {
        ...plan,
        liters: `${finalLiters.toLocaleString()} L`,
        inclusions: planInclusions,
        employees: getEmployees(finalLiters),
        stations: getStations(finalLiters),
    }
  }, [plan, additionalLiters]);


  const currencyFormatter = new Intl.NumberFormat('en-ph', { style: 'currency', currency: 'php' });

  const handleSaveProposal = () => {
    toast({
        title: "Proposal Saved!",
        description: "Your proposal has been saved as a draft.",
    });
  }
  
  if (!plan || !finalPlan) {
    return (
        <div className="flex flex-col gap-6 items-center justify-center h-full">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>No Plan Selected</CardTitle>
                    <CardDescription>
                        Please go back and select a plan to continue.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href="/dashboard/proposals/new/plans">Go to Plans</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
  }

  const rotationInfo = gallonRotationData[plan.id] || gallonRotationData['custom-plan'];
  
  const summaryTitle = finalPlan.name.includes("Plan") ? finalPlan.name : `${finalPlan.name} Plan`;

  const prevLink = `/dashboard/proposals/new/plans?${searchParams.toString()}`;
  
  const selectedCycle = billingCycles.find(c => c.value === billingCycle) || billingCycles[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finalize Proposal</h1>
          <p className="text-muted-foreground">
            Step 5: Review inclusions, add-ons, and sign the agreement.
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href={prevLink}>Previous</Link>
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
                <CardTitle>Plan Summary: {summaryTitle}</CardTitle>
                <CardDescription>
                    A summary of the selected subscription plan details for the upcoming {billingCycleLabel} period. (Includes +20% free liters every month)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-primary text-primary-foreground">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Liters</CardTitle>
                            <Waves className="h-4 w-4 text-primary-foreground/70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{finalPlan.liters}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary text-primary-foreground">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Water Stations</CardTitle>
                            <Building className="h-4 w-4 text-primary-foreground/70" />
                        </CardHeader>
                        <CardContent>
                             <div className="text-2xl font-bold">{finalPlan.stations}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary text-primary-foreground">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Refillable</CardTitle>
                            <Package className="h-4 w-4 text-primary-foreground/70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {rotationInfo.gallons > 0 ? `${rotationInfo.gallons} Gallons` : 'Dynamic'}
                                <span className="text-sm font-normal ml-1">(free)</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary text-primary-foreground">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg. Refill Frequency</CardTitle>
                            <RefreshCcw className="h-4 w-4 text-primary-foreground/70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{finalPlan.refillFrequency}</div>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
        
        <div className="w-full flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Distribution &amp; Operation Timeline</CardTitle>
                    <CardDescription>Key milestones for service activation.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                     <div className="relative flex justify-between">
                        <TimelineItem 
                            icon={<CheckCircle className="h-5 w-5" />}
                            title="Account Activation"
                            description="Client portal is set up within 24 hours of signing and making payment."
                        />
                        <TimelineItem 
                            icon={<CalendarCheck className="h-5 w-5" />}
                            title="Onboarding"
                            description="Initial delivery schedule set within 48 hours."
                        />
                        <TimelineItem 
                            icon={<Ship className="h-5 w-5" />}
                            title="First Delivery"
                            description="Equipment and first water batch arrive in 3-5 business days."
                        />
                        <TimelineItem 
                            icon={<Bot className="h-5 w-5" />}
                            title="Automated Refill"
                            description="System manages refills based on your consumption."
                            isLast
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
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
                        <TableHead className="w-[200px]">Quantity</TableHead>
                        <TableHead className="text-right">Monthly Fee</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {addons.map((addon) => (
                        <TableRow key={addon.id}>
                            <TableCell>
                                {addon.type === 'checkbox' && (
                                    <Checkbox 
                                        id={addon.id} 
                                        onCheckedChange={() => handleAddonToggle(addon.id)}
                                        checked={selectedAddons[addon.id]}
                                    />

                                )}
                            </TableCell>
                            <TableCell>
                                <Label htmlFor={addon.id} className="font-semibold">{addon.name}</Label>
                                <p className="text-muted-foreground text-xs mt-1">{addon.description}</p>
                            </TableCell>
                            <TableCell>
                                {addon.type === 'quantity' && (
                                    <Input 
                                        id={addon.id}
                                        type="number"
                                        min="0"
                                        value={additionalDispensers}
                                        onChange={(e) => setAdditionalDispensers(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="w-24"
                                    />
                                )}
                                {addon.type === 'slider' && (
                                    <div className="flex items-center gap-4">
                                        <Slider
                                            id={addon.id}
                                            min={0}
                                            max={1000}
                                            step={50}
                                            value={[additionalLiters]}
                                            onValueChange={(value) => setAdditionalLiters(value[0])}
                                            className="w-[120px]"
                                        />
                                        <span className="text-sm font-medium w-[60px] text-right">{additionalLiters} L</span>
                                    </div>
                                )}
                            </TableCell>
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
                    <div className="space-y-2">
                        <div>
                            <p className="font-semibold">{summaryTitle} ({billingCycleLabel})</p>
                            <p className="text-2xl font-bold">{currencyFormatter.format(basePrice)}<span className="text-sm font-normal text-muted-foreground"> / mo</span></p>
                        </div>
                        <ul className="text-xs text-muted-foreground list-disc pl-5">
                            <li>{finalPlan.liters} total (includes 20% free liters) / mo</li>
                             {finalPlan.inclusions && finalPlan.inclusions[0] && <li>{finalPlan.inclusions[0]}</li>}
                            <li>Refill Frequency: {finalPlan.refillFrequency}</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        {addons.map(addon => addon.type === 'checkbox' && selectedAddons[addon.id] && (
                            <div key={addon.id} className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">{addon.name}</span>
                                <span className="font-medium">{currencyFormatter.format(addon.feeValue)}</span>
                            </div>
                        ))}
                        {additionalDispensers > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Additional Dispensers ({additionalDispensers}x)</span>
                                <span className="font-medium">{currencyFormatter.format(additionalDispensers * additionalDispenserCost)}</span>
                            </div>
                        )}
                        {additionalLiters > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Additional Liters ({additionalLiters} L)</span>
                                <span className="font-medium">{currencyFormatter.format(additionalLiters * additionalLiterCost)}</span>
                            </div>
                        )}
                    </div>
                    
                    <Separator />
                    
                    <div className='space-y-2'>
                        <Label>Payment Schedule</Label>
                        <RadioGroup value={billingCycle} onValueChange={setBillingCycle} className="space-y-1">
                            {billingCycles.map((cycle) => (
                                <div key={cycle.value} className="flex items-center space-x-2">
                                    <RadioGroupItem value={cycle.value} id={cycle.value} />
                                    <Label htmlFor={cycle.value} className="font-normal">
                                        {cycle.label} ({cycle.discount * 100}% discount)
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total Due</span>
                        <span>{totalAmount}</span>
                    </div>

                    {selectedCycle.multiplier > 1 && (
                        <div className="flex justify-between items-center text-sm text-muted-foreground pt-1">
                            <span>Total Liters for Period</span>
                            <span>{totalLiters.toLocaleString()} L</span>
                        </div>
                    )}
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
                            additionalLiters={additionalLiters}
                            plan={plan}
                            finalPlan={finalPlan}
                            clientName={contactName}
                            clientCompany={companyName}
                        />
                    </Dialog>
                </CardFooter>
            </Card>
        </div>

        <PaymentMethods />
      </div>
    </div>
  );
}

export default function ContractPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <ContractPageContent />
        </React.Suspense>
    )
}
    

    










