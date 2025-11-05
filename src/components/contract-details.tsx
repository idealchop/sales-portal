

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignaturePad, type SignaturePadRef } from '@/components/signature-pad';
import { allPlans, gallonRotationData } from '@/app/dashboard/proposals/new/plans/page';
import { ContractText } from '@/app/dashboard/proposals/new/contract/page';
import { Logo } from '@/components/logo';
import { Waves, Users, Package, RefreshCcw, Computer, CalendarClock, RotateCw, Thermometer, Wrench, CircleHelp, Phone, Rocket, HeartPulse, Coffee, Building, Car } from 'lucide-react';
import type { Client, Plan, Proposal } from '@/lib/definitions';
import Image from 'next/image';

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
];

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

const billingCycles = [
  { value: 'monthly', label: 'Monthly', discount: 0, multiplier: 1 },
  { value: 'quarterly', label: 'Quarterly', discount: 0.03, multiplier: 3 },
  { value: 'semi-annually', label: 'Semi-Annually', discount: 0.05, multiplier: 6 },
  { value: 'annually', label: 'Annually', discount: 0.10, multiplier: 12 },
];


export type FinalPlanDetails = {
    date: string;
    summaryTitle: string;
    totalLiters: string;
    employees: string;
    refillableGallons: string;
    refillFrequency: string;
    totalAmountDue: string;
    billingCycleLabel: string;
    discount: number;
    basePrice: number;
    selectedAddons: { [key: string]: boolean };
    additionalDispensers: number;
    additionalLiters: number;
    plan: Plan;
    finalPlan: any;
    planBaseCost: number;
    addons: any[];
    additionalDispenserCost: number;
    additionalLiterCost: number;
    totalMonthlyLiters: number;
    totalLitersForCycle: number;
    clientId?: string;
    proposalId?: string;
    companyName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    clientType?: 'household' | 'sme' | 'commercial' | 'corporate' | 'enterprise';
    signature?: string;
};


interface ContractDetailsProps {
    finalPlanDetails?: FinalPlanDetails;
    client: Partial<Client> & { proposals?: Proposal[] };
    isSigned: boolean;
    signaturePadRef?: React.RefObject<SignaturePadRef>;
}

export function ContractDetails({
    finalPlanDetails,
    client,
    isSigned,
    signaturePadRef,
}: ContractDetailsProps) {

    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    
    // Determine which data source to use
    let source: FinalPlanDetails | null = null;

    if (isSigned && client.proposals && client.proposals.length > 0) {
        try {
            source = JSON.parse(client.proposals[0].content || '{}');
            // If the proposal object itself has an ID, use it. Otherwise, it's embedded in the content.
            source!.proposalId = client.proposals[0].id || source!.proposalId;
            source!.clientId = client.id || source!.clientId;
        } catch (e) {
            console.error("Failed to parse proposal content", e);
            return <p>Error loading contract details.</p>;
        }
    } else {
        source = finalPlanDetails || null;
    }

    if (!source) return <p>Contract details not available.</p>;
    
    const date = source.date;
    const clientId = client.id || source.clientId;
    const proposalId = source.proposalId;

    const summaryTitle = source.summaryTitle;
    const planBaseCost = source.planBaseCost;
    
    const selectedAddons = source.selectedAddons || {};
    
    const additionalDispensers = source.additionalDispensers || 0;
        
    const additionalLiters = source.additionalLiters || 0;

    const billingCycleLabel = source.billingCycleLabel;
    const totalAmountDue = source.totalAmountDue;

    const rotationInfo = source.plan?.id ? (gallonRotationData[source.plan.id] || gallonRotationData['custom-plan']) : null;
    const refillableGallons = source.refillableGallons;
    
    const plan = source.plan;

    const finalPlan = source.finalPlan;
    
    const addons = source.addons || [];
    const additionalDispenserCost = source.additionalDispenserCost || 250;
    const additionalLiterCost = source.additionalLiterCost || 3;
    const dispensersCost = Number(additionalDispensers) * additionalDispenserCost;
    const litersCost = additionalLiters * additionalLiterCost;

    if (!finalPlan) return null;

    return (
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
                    {clientId && <p className="font-mono text-sm text-muted-foreground">Client ID: {clientId}</p>}
                    {proposalId && <p className="font-mono text-sm text-muted-foreground">Proposal ID: {proposalId}</p>}
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
                            <span className="font-semibold font-mono">{clientId || 'Pending'}</span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                            <span className="text-muted-foreground">Name:</span>
                            <span className="font-semibold">{client.contactName || "N/A"}</span>
                        </div>
                         <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                            <span className="text-muted-foreground">Company:</span>
                            <span className="font-semibold">{client.companyName || "N/A"}</span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-semibold">{date}</span>
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
                                <p className="font-semibold">{refillableGallons}</p>
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
                    <CardTitle>Subscription Summary & Cost Breakdown</CardTitle>
                    <CardDescription>This section outlines the specific services and costs for this agreement, based on a {billingCycleLabel.toLowerCase()} payment schedule.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 p-4 border rounded-lg">
                        <h4 className="font-semibold text-foreground">Base Plan: {summaryTitle}</h4>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Monthly Cost</span>
                            <span className="font-semibold">{currencyFormatter.format(planBaseCost || source.basePrice || 0)}</span>
                        </div>
                    </div>
                     {(Object.values(selectedAddons).some(v => v) || additionalDispensers > 0 || additionalLiters > 0) && (
                        <div className="space-y-2 p-4 border rounded-lg">
                             <h4 className="font-semibold text-foreground">Add-Ons</h4>
                            {addons.map((addon) => (
                                addon.type === 'checkbox' && selectedAddons[addon.id] && (
                                    <div key={addon.id} className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">{addon.name}</span>
                                        <span className="font-semibold">{currencyFormatter.format(addon.feeValue)}</span>
                                    </div>
                                )
                            ))}
                            {Number(additionalDispensers) > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Additional Dispensers ({additionalDispensers}x)</span>
                                    <span className="font-semibold">{currencyFormatter.format(dispensersCost)}</span>
                                </div>
                            )}
                            {additionalLiters > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Additional Liters ({additionalLiters} L)</span>
                                    <span className="font-semibold">{currencyFormatter.format(litersCost)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <Separator className="my-4" />

                    <div className="flex justify-between items-center font-bold text-lg p-4 bg-muted rounded-lg">
                        <span>Total Due for {billingCycleLabel} Period</span>
                        <span>{totalAmountDue}</span>
                    </div>
                </CardContent>
            </Card>
            
            {rotationInfo && (
                <Card>
                    <CardHeader>
                        <CardTitle>Gallon Rotation &amp; Handling Guide</CardTitle>
                        <CardDescription>
                            Recommendations for managing your gallon inventory to ensure seamless service.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            <div className="space-y-2">
                                <Label>Recommended Gallons for Rotation</Label>
                                <p className="text-3xl font-bold">{refillableGallons} gallons</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Handling Notes</Label>
                                <p className="text-sm text-muted-foreground">{rotationInfo.notes}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

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
                                <Input id="name-preview" placeholder="Full Name" value={client.contactName} readOnly />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company-preview">Company</Label>
                                <Input id="company-preview" placeholder="Company Name" value={client.companyName} readOnly />
                            </div>
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input placeholder="Date" value={date} readOnly />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Signature</Label>
                             {isSigned && source.signature ? (
                                <div className="w-full h-[200px] border rounded-md bg-gray-50 flex items-center justify-center">
                                    <Image src={source.signature} alt="Client Signature" width={300} height={150} className="object-contain" />
                                </div>
                            ) : !isSigned ? (
                                <SignaturePad ref={signaturePadRef} />
                            ) : (
                                <div className="w-full h-[200px] border rounded-md bg-gray-50 flex items-center justify-center">
                                     <p className="text-muted-foreground">No signature on file.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
