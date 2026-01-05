
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignaturePad, type SignaturePadRef } from '@/components/signature-pad';
import { allPlans, gallonRotationData } from '@/app/dashboard/proposals/new/plans/page';
import { Logo } from '@/components/logo';
import { Waves, Users, Package, RefreshCcw, Computer, CalendarClock, RotateCw, Thermometer, Wrench, CircleHelp, Phone, Rocket, HeartPulse, Coffee, Building, Car, CheckCircle, Ship, Bot, Loader2, Receipt, User } from 'lucide-react';
import type { Client, Plan, Proposal } from '@/lib/definitions';
import Image from 'next/image';


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

export function ContractText({ summaryTitle, finalPlan, baseLiters, billingCycleLabel, totalAmountDue, selectedAddons, additionalDispensers, addons, isCustomPlan, pricePerLiter, sanitationFeeType, sanitationFee, dispenserQuantity, dispenserFeeType, dispenserFee } : { summaryTitle: string, finalPlan: any, baseLiters: number, billingCycleLabel: string, totalAmountDue: string, selectedAddons: any, additionalDispensers: {quantity: number, feeType: string, fee: number}, addons: any[], isCustomPlan: boolean, pricePerLiter: number, sanitationFeeType: string, sanitationFee: number, dispenserQuantity: number, dispenserFeeType: string, dispenserFee: number }) {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    
    return (
        <>
            <ContractSection title="1. Purpose">
                <p>
                    This Agreement governs the water supply subscription service delivered through Smart Refill’s automated system and partner refill stations.
                </p>
            </ContractSection>

            <ContractSection title="2. Service Overview">
                <p>Smart Refill provides:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Scheduled and automated water deliveries through verified local partner refill stations.</li>
                    <li>Water compliant with DOH, DENR, and FDA standards.</li>
                    <li>Usage tracking, scheduling, and roll-over management via the Smart Refill platform.</li>
                    <li>Monthly consumption and compliance reports for operational monitoring and transparency.</li>
                </ul>
            </ContractSection>

            <ContractSection title="3. Subscription Plans">
                <ul className="list-disc pl-5 space-y-2">
                    <li><span className="font-semibold">Plan:</span> {summaryTitle}</li>
                    {!isCustomPlan && <li><span className="font-semibold">Monthly Liters:</span> {finalPlan.liters} (includes {baseLiters * 0.2}L bonus)</li>}
                    <li><span className="font-semibold">Billing Cycle:</span> {billingCycleLabel}</li>
                    <li>
                        <span className="font-semibold">Payment Term:</span> 
                        {isCustomPlan 
                            ? ` Billed based on monthly consumption at a rate of ${currencyFormatter.format(pricePerLiter)} per liter.`
                            : ` Prepaid. Total Amount Due per Cycle: ${totalAmountDue}.`
                        }
                    </li>
                        {(sanitationFeeType !== 'free' || dispenserQuantity > 0) && (
                        <li className="font-semibold">Add-Ons:
                            <ul className="list-circle pl-5 font-normal">
                                {sanitationFeeType === 'paid' && <li>Monthly Sanitation</li>}
                                {dispenserQuantity > 0 && (<li>{dispenserQuantity}x Additional Dispensers</li>)}
                            </ul>
                        </li>
                    )}
                </ul>
            </ContractSection>

            <ContractSection title="4. Delivery &amp; Refills">
                <ul className="list-disc pl-5 space-y-2">
                    <li>Water is delivered automatically based on usage data or refill schedules set in the Smart Refill system.</li>
                    <li>Deliveries are performed by accredited local partner refill stations under the Smart Refill network.</li>
                    <li>Delivery schedules may be adjusted by Smart Refill for operational efficiency and service reliability.</li>
                </ul>
            </ContractSection>
            
            <ContractSection title="5. Equipment Use">
                <ul className="list-disc pl-5 space-y-2">
                    <li>Each plan includes free use of dispensers and bottles (quantity based on plan tier).</li>
                    <li>Equipment remains the property of River Tech Group, Inc.</li>
                    <li>If the Client exceeds included equipment limits, additional units may be provided as rentals.</li>
                    <li>The Client must maintain equipment in good condition and return or replace damaged items.</li>
                </ul>
            </ContractSection>

            <ContractSection title="6. Payment Terms">
                 <ul className="list-disc pl-5 space-y-2">
                    {isCustomPlan ? (
                        <>
                            <li>Billing is based on actual consumption, calculated at the end of each monthly cycle.</li>
                            <li>Invoices will be issued monthly and are due within 15 days of receipt.</li>
                        </>
                    ) : (
                        <>
                            <li>Subscriptions are prepaid based on the selected billing cycle.</li>
                            <li>Payment covers the included liter allocation and any applicable service fees.</li>
                            <li>Unused liters roll over for up to two (2) consecutive months, after which they expire.</li>
                        </>
                    )}
                    <li>Payments are non-refundable after activation.</li>
                </ul>
            </ContractSection>

            <ContractSection title="7. Quality &amp; Compliance">
                <ul className="list-disc pl-5 space-y-2">
                    <li>Smart Refill ensures all partner stations meet government-approved water safety and sanitation standards.</li>
                    <li>Periodic sampling and compliance monitoring are conducted to maintain quality assurance.</li>
                </ul>
            </ContractSection>

            <ContractSection title="8. Liability &amp; Health Safety">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-foreground">Water Quality Assurance</h4>
                        <p>River Tech Group, Inc., through its Smart Refill network, ensures that all partner refill stations operate with valid permits and comply with the latest DOH, DENR, and FDA standards for potable water.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">Health-Related Incidents</h4>
                        <p>In the unlikely event of a verified contamination or water-borne health issue directly attributable to the supplied water, Smart Refill shall:</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>Conduct an immediate quality investigation in coordination with the concerned partner refill station.</li>
                            <li>Replace the affected water volume at no additional cost.</li>
                            <li>Cooperate with local health authorities in assessing the incident and taking corrective actions.</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">Limitation of Liability</h4>
                        <p>Smart Refill and River Tech Group, Inc. shall not be liable for:</p>
                         <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>Any injury, illness, or loss resulting from improper storage, handling, or dispensing of water after delivery to the Client.</li>
                            <li>Any contamination occurring due to unsanitary practices, equipment misuse, or third-party handling beyond Smart Refill’s control.</li>
                            <li>Indirect, consequential, or punitive damages arising from service interruption, delay, or force majeure events.</li>
                        </ul>
                        <p className="mt-2">The Provider’s total liability in any claim shall not exceed the total subscription amount paid by the Client within the past three (3) months preceding the incident.</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-foreground">Client Responsibilities</h4>
                        <p>The Client agrees to maintain clean and safe dispenser locations, use only Smart Refill-approved bottles and dispensers, and promptly report any suspected quality issue to Smart Refill’s support channel for verification and corrective action.</p>
                    </div>
                </div>
            </ContractSection>

            <ContractSection title="9. Subscription Renewal, Suspension, and Termination">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-foreground">9.1 Auto-Renewal</h4>
                        <p>All Smart Refill subscriptions automatically renew at the end of each billing cycle (monthly, quarterly, semi-annual, or annual) unless cancelled by the Client at least 30 days prior to renewal. Renewal will continue at the same plan tier and payment frequency unless modified in writing or via the Smart Refill platform.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">9.2 Cancellation by Client</h4>
                         <ul className="list-disc pl-5 space-y-1">
                            <li>The Client may cancel their subscription by providing written notice at least 30 days before the next billing cycle.</li>
                            <li>All prepaid amounts are non-refundable, and unused liters expire upon termination unless otherwise agreed in writing.</li>
                            <li>Any equipment (dispensers, bottles, etc.) provided under the plan must be returned in good working condition within seven (7) days of cancellation. Failure to return equipment may incur corresponding replacement or depreciation charges.</li>
                        </ul>
                    </div>
                    <div>
                         <h4 className="font-semibold text-foreground">9.3 Suspension by Smart Refill</h4>
                        <p>Smart Refill reserves the right to temporarily suspend services in the event of:</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                           <li>Non-payment or failed billing,</li>
                           <li>Misuse of water allocation or system tampering,</li>
                           <li>Breach of safety or compliance standards,</li>
                           <li>Verified equipment loss or misuse.</li>
                        </ul>
                        <p className="mt-2">Service will resume once the Client resolves the issue and payment or compliance is restored.</p>
                    </div>
                    <div>
                         <h4 className="font-semibold text-foreground">9.4 Termination by Smart Refill</h4>
                        <p>Smart Refill may terminate this Agreement:</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>For cause, with immediate effect, upon material breach by the Client (including non-payment, damage to equipment, or fraudulent activity); or</li>
                            <li>Without cause, with thirty (30) days’ written notice, for business or operational reasons.</li>
                        </ul>
                         <p className="mt-2">Upon termination, all dispensers, bottles, or devices provided must be returned, and any remaining prepaid liters or balances shall be forfeited.</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-foreground">9.6 Reactivation</h4>
                        <p>A Client may reactivate a terminated or cancelled subscription anytime by subscribing to a new plan through the Smart Refill platform. Equipment and service fees may apply depending on previous plan tier and usage history.</p>
                    </div>
                </div>
            </ContractSection>
            
            <ContractSection title="10. Data and Monitoring">
                <ul className="list-disc pl-5 space-y-2">
                    <li>Operational data (usage, deliveries, consumption patterns) may be used solely for service improvement and compliance reporting.</li>
                    <li>Data is processed in accordance with the Data Privacy Act of 2012.</li>
                </ul>
            </ContractSection>

             <ContractSection title="11. Trademarks &amp; Ownership">
                 <ul className="list-disc pl-5 space-y-2">
                    <li>Smart Refill is a registered trademark under River Tech Group, Inc.</li>
                    <li>All materials, systems, and technologies remain the intellectual property of the Provider.</li>
                 </ul>
            </ContractSection>

            <ContractSection title="12. Governing Law">
                <p>This Agreement shall be governed by and construed in accordance with the laws of the Republic of the Philippines.</p>
            </ContractSection>
        </>
    )
}

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
    sanitationFeeType: string;
    sanitationFee: number;
    additionalDispensers: { quantity: number; feeType: string; fee: number; };
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
    pricePerLiter?: number;
    dispensers?: number;
    containers?: number;
};


interface ContractDetailsProps {
    finalPlanDetails: FinalPlanDetails;
    isSigned: boolean;
    signatureData?: string;
    onSaveSignature?: (dataUrl: string) => void;
    onClearSignature?: () => void;
    isProposalIllustration?: boolean;
}

export function ContractDetails({
    finalPlanDetails,
    isSigned,
    signatureData,
    onSaveSignature,
    onClearSignature,
    isProposalIllustration = false,
}: ContractDetailsProps) {

    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    
    // Determine which data source to use
    let source: FinalPlanDetails | null = finalPlanDetails;

    if (!source) return <p>Contract details not available.</p>;
    
    const date = source.date;
    const clientId = source.clientId;
    const proposalId = source.proposalId;
    const client = {
        companyName: source.companyName,
        contactName: source.contactName,
        contactEmail: source.contactEmail,
        contactPhone: source.contactPhone,
        address: source.address,
    };

    const summaryTitle = source.summaryTitle;
    const planBaseCost = source.planBaseCost;
    
    const selectedAddons = source.selectedAddons || {};
    
    const additionalDispensers = source.additionalDispensers.quantity || 0;
        
    const billingCycleLabel = source.billingCycleLabel;
    const totalAmountDue = source.totalAmountDue;

    const rotationInfo = source.plan?.id ? (gallonRotationData[source.plan.id] || gallonRotationData['custom-plan']) : null;
    
    const plan = source.plan;

    const finalPlan = source.finalPlan;
    
    const addons = source.addons || [];
    
    const baseLiters = parseInt(plan.liters.replace(/[^0-9]/g, '')) || 0;
    const freeLiters = baseLiters * 0.2;
    const isCustomPlan = plan.id === 'custom-plan';
    const pricePerLiter = source.pricePerLiter || 0;

    const dispenserFeeTypeLabel = source.additionalDispensers.feeType === 'monthly' ? 'Monthly' : source.additionalDispensers.feeType === 'security' ? 'Security Deposit' : 'Free';
    const dispensersCost = source.additionalDispensers.feeType !== 'free' ? source.additionalDispensers.quantity * source.additionalDispensers.fee : 0;


    if (!finalPlan) return null;
    
    const refillableGallons = isCustomPlan ? source.containers : source.refillableGallons;
    const dispensers = isCustomPlan ? source.dispensers : (rotationInfo?.gallons ? Math.ceil(rotationInfo.gallons / 5) : 1);


    return (
        <div className="space-y-6 p-2">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-primary">River Tech Group, Inc.</h2>
                    <p className="text-muted-foreground">Operating as Smart Refill</p>
                    <p className="text-xs text-muted-foreground">123 Innovation Drive, BGC, Taguig, Metro Manila, Philippines</p>
                    <p className="text-xs text-muted-foreground">smartrefill.io</p>
                </div>
                <div className="text-right">
                    <p className="text-xl font-bold">Sales Illustration</p>
                    {clientId && <p className="font-mono text-sm text-muted-foreground">Client ID: {clientId}</p>}
                    {proposalId && <p className="font-mono text-sm text-muted-foreground">Proposal ID: {proposalId}</p>}
                </div>
            </div>
            
            <Separator />
            
            <Card>
                <CardHeader>
                    <CardTitle>Welcome to Smart Refill</CardTitle>
                    <CardDescription>
                        A smarter, more reliable way to manage your business's water supply.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Thank you for choosing Smart Refill. This proposal outlines how our automated solution helps you achieve consistent water availability, lower operational costs, and complete visibility over your consumption.
                    </p>
                    <p className="text-muted-foreground mt-4">
                        We go beyond delivery — we help you save time, cut inefficiencies, and ensure every liter counts.
                    </p>
                </CardContent>
            </Card>


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
                            <span className="text-muted-foreground">Company:</span>
                            <span className="font-semibold">{client.companyName || "N/A"}</span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                            <span className="text-muted-foreground">Name:</span>
                            <span className="font-semibold">{client.contactName || "N/A"}</span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-semibold">{client.contactEmail || "N/A"}</span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                            <span className="text-muted-foreground">Phone:</span>
                            <span className="font-semibold">{client.contactPhone || "N/A"}</span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] items-start gap-2">
                            <span className="text-muted-foreground">Address:</span>
                            <span className="font-semibold">{client.address || "N/A"}</span>
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
                        <div className="flex items-start gap-3">
                            <Waves className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-muted-foreground">Total Liters</p>
                                <p className="font-semibold">{finalPlan.liters}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Users className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-muted-foreground">{source.clientType === 'household' ? 'Family' : 'Employees'}</p>
                                <p className="font-semibold">{finalPlan.employees}</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-3">
                            <Package className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-muted-foreground">Rotation Containers</p>
                                <p className="font-semibold">{refillableGallons} units</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-3">
                            <Computer className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-muted-foreground">Dispensers</p>
                                <p className="font-semibold">{dispensers} units</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <RefreshCcw className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-muted-foreground">Refill Frequency</p>
                                <p className="font-semibold">{finalPlan.refillFrequency}</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-3">
                            <Ship className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-muted-foreground">Water Stations</p>
                                <p className="font-semibold">{finalPlan.stations}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Subscription Summary &amp; Cost Breakdown</CardTitle>
                    <CardDescription>This section outlines the specific services and costs for this agreement, based on a {billingCycleLabel.toLowerCase()} payment schedule.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 p-4 border rounded-lg">
                        <h4 className="font-semibold text-foreground">Base Plan: {summaryTitle}</h4>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">{isCustomPlan ? 'Price per Liter' : 'Monthly Cost'}</span>
                            <span className="font-semibold">{isCustomPlan ? `${currencyFormatter.format(pricePerLiter)}/L` : currencyFormatter.format(planBaseCost || source.basePrice || 0)}</span>
                        </div>
                        {!isCustomPlan && (
                            <>
                                <Separator className="my-2"/>
                                <h5 className="font-semibold text-foreground text-sm pt-2">Free Inclusions:</h5>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500" /> +20% Bonus Liters
                                    </span>
                                    <span className="font-semibold">{freeLiters.toLocaleString()} L / mo</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500" /> Automated Delivery &amp; Logistics
                                    </span>
                                    <span className="font-semibold">Included</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500" /> Monthly Sanitation &amp; Clean-up
                                    </span>
                                    <span className="font-semibold">Included</span>
                                </div>
                            </>
                        )}
                    </div>
                     {(source.sanitationFeeType !== 'free' || source.additionalDispensers.quantity > 0) && (
                        <div className="space-y-2 p-4 border rounded-lg">
                             <h4 className="font-semibold text-foreground">Add-Ons</h4>
                             {source.sanitationFeeType === 'paid' && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Monthly Sanitation</span>
                                    <span className="font-semibold">{currencyFormatter.format(source.sanitationFee)}</span>
                                </div>
                            )}
                            {Number(additionalDispensers) > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Additional Dispensers ({additionalDispensers}x) - {dispenserFeeTypeLabel}</span>
                                    <span className="font-semibold">{dispensersCost > 0 ? currencyFormatter.format(dispensersCost) : 'Free'}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <Separator className="my-4" />

                    <div className="flex justify-between items-center font-bold text-lg p-4 bg-muted rounded-lg">
                        <span>{isCustomPlan ? 'Billed by Consumption' : 'Total Due'}</span>
                        <span>{totalAmountDue}</span>
                    </div>
                     <p className="text-xs text-muted-foreground text-right">All applicable taxes are included.</p>
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

            {!isProposalIllustration && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Smart Refill Water Supply Subscription Agreement</CardTitle>
                            <CardDescription>
                                Between: River Tech Group, Inc. (“Provider”) and the Subscriber (“Client”).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <ContractText 
                                summaryTitle={summaryTitle}
                                finalPlan={finalPlan}
                                baseLiters={baseLiters}
                                billingCycleLabel={billingCycleLabel}
                                totalAmountDue={totalAmountDue}
                                selectedAddons={selectedAddons}
                                addons={addons}
                                isCustomPlan={isCustomPlan}
                                pricePerLiter={pricePerLiter}
                                sanitationFeeType={source.sanitationFeeType}
                                sanitationFee={source.sanitationFee}
                                dispenserQuantity={source.additionalDispensers.quantity}
                                dispenserFeeType={source.additionalDispensers.feeType}
                                dispenserFee={source.additionalDispensers.fee}
                            />
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
                                    ) : !isSigned && onSaveSignature && onClearSignature ? (
                                        <SignaturePad 
                                            signatureData={signatureData}
                                            onSave={onSaveSignature}
                                            onClear={onClearSignature}
                                        />
                                    ) : (
                                        <div className="w-full h-[200px] border rounded-md bg-gray-50 flex items-center justify-center">
                                            <p className="text-muted-foreground">No signature on file.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
