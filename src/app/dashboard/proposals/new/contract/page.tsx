

'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Send, Rocket, Computer, CalendarClock, RotateCw, AreaChart, Thermometer, Wrench, CircleHelp, Phone, Users, Waves, Package, CheckCircle, CalendarCheck, Ship, Bot, Save, HeartPulse, Coffee, Building, Car, RefreshCcw, CreditCard, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Logo } from '@/components/logo';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import Image from 'next/image';
import { allPlans, deliveryFrequencies, gallonRotationData } from '../plans/page';
import { PaymentMethods } from '@/components/payment-methods';
import { ContractDetails, type FinalPlanDetails } from '@/components/contract-details';
import type { Client } from '@/lib/definitions';
import { useFirestore, useUser } from '@/firebase';
import { collection, serverTimestamp, addDoc, doc, setDoc, runTransaction, getDoc } from 'firebase/firestore';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


const billingCycles = [
  { value: 'monthly', label: 'Monthly', discount: 0, multiplier: 1 },
  { value: 'quarterly', label: 'Quarterly', discount: 0.03, multiplier: 3 },
  { value: 'semi-annually', label: 'Semi-Annually', discount: 0.05, multiplier: 6 },
  { value: 'annually', label: 'Annually', discount: 0.10, multiplier: 12 },
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
                <p>
                    Smart Refill provides a comprehensive water supply solution that includes scheduled and automated water deliveries through verified local partner refill stations. We guarantee that all water supplied is compliant with DOH, DENR, and FDA standards. Our platform enables real-time usage tracking, automated scheduling, and roll-over management for unused liters. Clients receive monthly consumption and compliance reports for operational transparency.
                </p>
            </ContractSection>

            <ContractSection title="3. Subscription Plans">
                <ul className="list-disc pl-5 space-y-1">
                    <li>Clients may subscribe under any active Smart Refill™ plan (Micro, Starter, Pro, Business, Enterprise+, or Unlimited+).</li>
                    <li>Each plan includes a defined number of liters per month, optional roll-over (2 months), and a fixed prepaid fee.</li>
                    <li>Additional liters beyond plan limits are billed at the plan’s add-on rate.</li>
                </ul>
            </ContractSection>

            <ContractSection title="4. Delivery & Refills">
                 <p>
                    Water is delivered automatically based on usage data or a pre-set refill schedule configured in the Smart Refill™ system. All deliveries are performed by accredited local partner refill stations within the Smart Refill™ network. For operational efficiency and to ensure service reliability, delivery schedules may be adjusted by Smart Refill™, with prior notification to the client.
                </p>
            </ContractSection>
            
            <ContractSection title="5. Equipment Use">
                 <p>
                    Each subscription plan includes the free use of a specified number of water dispensers and refillable gallons, with the quantity determined by the plan tier. All equipment remains the property of River Tech Group, Inc. Should the Client require more equipment than the plan provides, additional units may be rented. The Client is responsible for maintaining all equipment in good condition and must return or cover the replacement cost for any damaged or lost items upon termination of the service.
                </p>
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
                        <h4 className="font-semibold text-foreground">8.1 Water Quality Assurance</h4>
                        <p>River Tech Group, Inc., through its Smart Refill™ network, ensures that all partner refill stations operate with valid permits and comply with the latest DOH, DENR, and FDA standards for potable water.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">8.2 Health-Related Incidents</h4>
                        <p>In the unlikely event of a verified contamination or water-borne health issue directly attributable to the supplied water, Smart Refill™ shall conduct an immediate quality investigation, replace the affected water volume at no additional cost, and cooperate with local health authorities.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">8.3 Limitation of Liability</h4>
                        <p>Smart Refill™ and River Tech Group, Inc. shall not be liable for issues resulting from improper storage, handling, or dispensing by the Client. The Provider’s total liability shall not exceed the total subscription amount paid by the Client within the past three (3) months.</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-foreground">8.4 Client Responsibilities</h4>
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
                 <p>
                    Client information and operational data are saved and used for service improvement, compliance reporting, and to ensure the successful delivery and refilling of water. All data is handled in accordance with the Data Privacy Act of 2012.
                </p>
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
    finalPlanDetails,
    isSaving,
    isDialogOpen,
    setDialogOpen,
    saveProposal,
}: { 
    finalPlanDetails: FinalPlanDetails,
    isSaving: boolean;
    isDialogOpen: boolean;
    setDialogOpen: (open: boolean) => void;
    saveProposal: (status: 'draft' | 'finalized', signature?: string) => Promise<void>;
}) {
    const signaturePadRef = useRef<SignaturePadRef>(null);
    const { toast } = useToast();

    const handleSaveDraft = async () => {
      await saveProposal('draft', signaturePadRef.current?.getSignatureDataUrl());
    };
    
    const handleFinalize = async () => {
        const signatureDataUrl = signaturePadRef.current?.getSignatureDataUrl();
        if (signaturePadRef.current?.isEmpty()) {
            toast({
                variant: "destructive",
                title: "Signature Required",
                description: "Please provide a signature before finalizing.",
            });
            return;
        }
        await saveProposal('finalized', signatureDataUrl!);
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
             <DialogContent className="sm:max-w-5xl">
                <DialogHeader className="sr-only">
                    <DialogTitle>Proposal Preview</DialogTitle>
                    <DialogDescription>A preview of the sales proposal for the client to review and sign.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[85vh] pr-6">
                    <ContractDetails
                        finalPlanDetails={finalPlanDetails}
                        isSigned={false}
                        signaturePadRef={signaturePadRef}
                    />
                </ScrollArea>
                <DialogFooter className="gap-2 sm:justify-end border-t pt-4">
                    <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                         {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save as Draft
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0}>
                            <Button type="button" disabled={true}>
                              <Download className="mr-2 h-4 w-4" /> Download PDF
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>PDF generation is coming soon.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button type="button" disabled={isSaving}>
                                <Send className="mr-2 h-4 w-4" />
                                Finalize &amp; Send
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Finalize and Send Proposal?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will finalize the proposal and mark it as sent to the client.
                                    The proposal will be sent to the following email:
                                    <br />
                                    <strong className="font-mono">{finalPlanDetails.contactEmail}</strong>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleFinalize} disabled={isSaving}>
                                    {isSaving ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                                    ) : (
                                        'Yes, Send Proposal'
                                    )}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const planId = searchParams.get('plan');
  const customLiters = searchParams.get('liters');
  const customCost = searchParams.get('cost');
  const customFreq = searchParams.get('freq');
  const customType = searchParams.get('type');
  const companyName = searchParams.get('companyName') || '';
  const contactName = searchParams.get('contactName') || '';
  const contactEmail = searchParams.get('contactEmail') || '';
  const contactPhone = searchParams.get('contactPhone') || '';
  const address = searchParams.get('address') || '';
  const clientType = searchParams.get('clientType') as Client['clientType'];
  const existingClientId = searchParams.get('clientId'); 

  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState(billingCycles[0].value);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingIds, setIsGeneratingIds] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<{ [key: string]: boolean }>({
    'weekly-sanitation': false,
  });
  const [additionalDispensers, setAdditionalDispensers] = useState(0);
  const [additionalLiters, setAdditionalLiters] = useState(0);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [generatedClientId, setGeneratedClientId] = useState<string | undefined>(existingClientId);
  const [generatedProposalId, setGeneratedProposalId] = useState<string | undefined>();

  const getStations = (liters: number) => {
    if (liters <= 2000) return '1 Station';
    if (liters <= 6000) return '2-3 Stations';
    if (liters <= 25000) return '3-4 Stations';
    return '5+ Stations';
  }

  const getEmployees = (liters: number, isHousehold: boolean) => {
    if (isHousehold) {
        const estimatedPeople = Math.round(liters / (2 * 30)); // Assuming 2L per person per day
        if (estimatedPeople <= 3) return '1-3 People';
        if (estimatedPeople <= 5) return '3-5 People';
        return '5+ People';
    }
    const estimatedEmployees = Math.round(liters / (2 * 22));
    if (estimatedEmployees < 5) return '&lt; 5';
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
        } else if (customType === 'household') {
            typeName = 'Family';
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
            employees: getEmployees(litersNum, clientType === 'household'),
            stations: clientType === 'household' ? basePlan.stations : getStations(litersNum),
        };
    }
    
    if (customFreq) {
        const freqLabel = deliveryFrequencies.find(f => f.value === parseInt(customFreq))?.label;
        if (freqLabel) {
            basePlan.refillFrequency = freqLabel;
        }
    }

    return basePlan;
  }, [planId, customLiters, customCost, customFreq, customType, clientType]);
  
  const finalPlan = useMemo(() => {
    if (!plan) return null;
    const baseLiters = parseInt(plan.liters.replace(/[^0-9]/g, '')) || 0;
    const freeLiters = baseLiters * 0.2;
    const finalLiters = baseLiters + freeLiters + additionalLiters;
    const planInclusions = plan.id === 'enterprise-overflow' 
        ? ['Pay only for what you use'] 
        : (plan.inclusions && plan.inclusions.length > 0 ? [plan.inclusions[0]] : []);

    return {
        ...plan,
        liters: `${finalLiters.toLocaleString()} L`,
        inclusions: planInclusions,
        employees: getEmployees(finalLiters, clientType === 'household'),
        stations: clientType === 'household' ? plan.stations : getStations(finalLiters),
    }
  }, [plan, additionalLiters, clientType]);

  const handleAddonToggle = (addonId: string) => {
    setSelectedAddons(prev => ({...prev, [addonId]: !prev[addonId] }));
  }

  const finalPlanDetails: FinalPlanDetails | null = useMemo(() => {
    if (!plan || !finalPlan) return null;
    
    const planBaseCost = parseFloat(plan.monthlyFee.replace(/[^0-9.-]+/g,""));
    if (isNaN(planBaseCost)) {
      return null;
    }
    
    const addonsCost = addons.reduce((total, addon) => {
        if (addon.type === 'checkbox') {
            return total + (selectedAddons[addon.id] ? addon.feeValue : 0);
        }
        return total;
    }, 0);
    const dispensersCost = additionalDispensers * additionalDispenserCost;
    const litersCost = additionalLiters * additionalLiterCost;

    const subtotal = planBaseCost + addonsCost + dispensersCost + litersCost;
    const selectedCycle = billingCycles.find(c => c.value === billingCycle) || billingCycles[0];
    
    const totalBeforeDiscount = subtotal * selectedCycle.multiplier;
    const discountValue = totalBeforeDiscount * selectedCycle.discount;
    const finalAmount = totalBeforeDiscount - discountValue;
    
    const baseLiters = parseInt(plan.liters.replace(/[^0-9]/g, '')) || 0;
    const freeLiters = baseLiters * 0.2;
    const totalMonthlyLiters = baseLiters + freeLiters + additionalLiters;
    const totalLitersForCycle = totalMonthlyLiters * selectedCycle.multiplier;
    
    const rotationInfo = gallonRotationData[plan.id] || gallonRotationData['custom-plan'];

    const summaryTitle = plan.name.includes("Plan") ? plan.name : `${plan.name} Plan`;

    return {
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        summaryTitle: summaryTitle,
        totalLiters: `${totalLitersForCycle.toLocaleString()} L`,
        employees: finalPlan.employees,
        refillableGallons: rotationInfo.gallons > 0 ? `${rotationInfo.gallons}` : 'Dynamic',
        refillFrequency: finalPlan.refillFrequency,
        totalAmountDue: new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(finalAmount),
        billingCycleLabel: selectedCycle.label,
        discount: selectedCycle.discount,
        basePrice: subtotal,
        selectedAddons,
        additionalDispensers,
        additionalLiters,
        plan,
        finalPlan,
        planBaseCost,
        addons,
        additionalDispenserCost,
        additionalLiterCost,
        totalMonthlyLiters,
        totalLitersForCycle,
        clientId: generatedClientId,
        proposalId: generatedProposalId,
        companyName,
        contactName,
        contactEmail,
        contactPhone,
        address,
        clientType,
    };
  }, [plan, finalPlan, billingCycle, selectedAddons, additionalDispensers, additionalLiters, generatedClientId, generatedProposalId, companyName, contactName, contactEmail, contactPhone, address, clientType]);


  const currencyFormatter = new Intl.NumberFormat('en-ph', { style: 'currency', currency: 'php' });
  
  const saveProposal = async (status: 'draft' | 'finalized', signature?: string) => {
    if (!finalPlanDetails || !firestore || !user) {
        toast({
            variant: "destructive",
            title: "Missing Information",
            description: "Cannot save proposal without complete plan details, user session, or Firestore instance.",
        });
        return;
    }

    setIsSaving(true);
    
    try {
        const finalClientId = generatedClientId;

        if (!finalClientId) {
            throw new Error("Client ID was not generated. Cannot save proposal.");
        }

        // If it was a new client, create the document now.
        if (!existingClientId) {
            const newClientRef = doc(firestore, 'clients', finalClientId);
            const clientSnap = await getDoc(newClientRef);
            if (!clientSnap.exists()) {
                 const newClientData: Partial<Client> = {
                    id: finalClientId,
                    companyName: companyName,
                    contactName: contactName,
                    contactEmail: contactEmail,
                    contactPhone: contactPhone,
                    address: address,
                    clientType: clientType || 'sme',
                    status: 'pending',
                };
                await setDoc(newClientRef, newClientData);
            }
        }
        
        const proposalId = generatedProposalId;
        if (!proposalId) {
             throw new Error("Proposal ID was not generated. Cannot save proposal.");
        }
        const proposalRef = doc(firestore, `clients/${finalClientId}/proposals`, proposalId);

        const proposalContentToSave: FinalPlanDetails = {
            ...finalPlanDetails,
            clientId: finalClientId,
            proposalId: proposalId,
            signature,
        };
        
        const newProposalData = {
            id: proposalId,
            clientId: finalClientId,
            title: proposalContentToSave.summaryTitle,
            content: JSON.stringify(proposalContentToSave),
            status: status,
            amount: parseFloat(proposalContentToSave.totalAmountDue.replace(/[^0-9.-]+/g, "")),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        
        await setDoc(proposalRef, newProposalData, { merge: true });
        
        toast({
            title: status === 'draft' ? "Proposal Saved!" : "Proposal Finalized!",
            description: `Your proposal for ${companyName} has been successfully saved.`,
        });
        
        router.push('/dashboard/proposals');

    } catch (error: any) {
        console.error("Error saving proposal:", error);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: error.message || "An error occurred while saving the proposal.",
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleReviewAndSignClick = async () => {
    setIsGeneratingIds(true);
    let finalClientId = generatedClientId;
    let finalProposalId = generatedProposalId;

    try {
        if (!existingClientId && !finalClientId) {
            finalClientId = await runTransaction(firestore, async (transaction) => {
                const counterRef = doc(firestore, 'counters', 'clientCounter');
                const counterSnap = await transaction.get(counterRef);
                let newIdNumber = 1;
                if (counterSnap.exists()) {
                    newIdNumber = counterSnap.data().currentId + 1;
                }
                const year = new Date().getFullYear().toString().slice(-2);
                const newClientId = `SC${year}${String(newIdNumber).padStart(8, '0')}`;
                transaction.set(counterRef, { currentId: newIdNumber }, { merge: true });
                return newClientId;
            });
            setGeneratedClientId(finalClientId);
        }

        if (!finalProposalId) {
            const randomNumber = Math.floor(1000000000 + Math.random() * 9000000000);
            finalProposalId = String(randomNumber);
            setGeneratedProposalId(finalProposalId);
        }

        setDialogOpen(true);

    } catch (error: any) {
        console.error("Error generating IDs:", error);
        toast({
            variant: "destructive",
            title: "ID Generation Failed",
            description: error.message || "Could not generate required IDs. Please check console and Firestore rules.",
        });
    } finally {
        setIsGeneratingIds(false);
    }
  };
  
  if (!plan || !finalPlanDetails) {
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
  
  const summaryTitle = plan.name.includes("Plan") ? plan.name : `${plan.name} Plan`;

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
            <Button onClick={handleReviewAndSignClick} disabled={isSaving || isGeneratingIds}>
                {(isSaving || isGeneratingIds) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Review &amp; Sign
            </Button>
        </div>
      </div>

       {finalPlanDetails && (
            <PreviewDialog 
                finalPlanDetails={finalPlanDetails}
                isSaving={isSaving}
                isDialogOpen={isDialogOpen}
                setDialogOpen={setDialogOpen}
                saveProposal={saveProposal}
            />
       )}

      <div className="flex flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Plan Summary: {summaryTitle}</CardTitle>
                <CardDescription>
                    A summary of the selected subscription plan details for the upcoming {finalPlanDetails.billingCycleLabel} period. (Includes +20% free liters every month)
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
                            <div className="text-2xl font-bold">{finalPlan.liters} / mo</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary text-primary-foreground">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{clientType === 'household' ? 'Family' : 'Employees'}</CardTitle>
                            <Building className="h-4 w-4 text-primary-foreground/70" />
                        </CardHeader>
                        <CardContent>
                             <div className="text-2xl font-bold">{finalPlan.employees}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary text-primary-foreground">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Free Refillable Gallons</CardTitle>
                            <Package className="h-4 w-4 text-primary-foreground/70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {rotationInfo.gallons > 0 ? `${rotationInfo.gallons} Gallons` : 'Dynamic'}
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
                            <p className="font-semibold">{summaryTitle} ({finalPlanDetails.billingCycleLabel})</p>
                            <p className="text-2xl font-bold">{currencyFormatter.format(finalPlanDetails.basePrice)}<span className="text-sm font-normal text-muted-foreground"> / mo</span></p>
                        </div>
                        <ul className="text-xs text-muted-foreground list-disc pl-5">
                            <li>Total Liters: {finalPlan.liters} / mo (includes 20% bonus)</li>
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

                    <div className="flex justify-between items-center font-bold text-lg p-4 bg-muted rounded-lg">
                        <span>Total Due</span>
                        <span>{finalPlanDetails.totalAmountDue}</span>
                    </div>
                </CardContent>
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
