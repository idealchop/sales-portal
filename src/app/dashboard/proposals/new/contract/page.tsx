
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
import { Download, Send, Rocket, Computer, CalendarClock, RotateCw, AreaChart, Thermometer, Wrench, CircleHelp, Phone, Users, Waves, Package, CheckCircle, CalendarCheck, Ship, Bot, Save, HeartPulse, Coffee, Building, Car, RefreshCcw, CreditCard, Loader2, FileCheck, FileText, Eye, Badge } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Logo } from '@/components/logo';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import Image from 'next/image';
import { allPlans, deliveryFrequencies, gallonRotationData } from '@/app/dashboard/proposals/new/plans/page';
import { PaymentMethods } from '@/components/payment-methods';
import { ContractDetails, type FinalPlanDetails } from '@/components/contract-details';
import type { Client } from '@/lib/definitions';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, serverTimestamp, addDoc, doc, setDoc, runTransaction, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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


function GenerateProposalDialog({ finalPlanDetails, children }: { finalPlanDetails: FinalPlanDetails, children: React.ReactNode }) {
    const proposalRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [isDownloading, setIsDownloading] = useState(false);
    
    // State for the dialog's payment schedule
    const [dialogBillingCycle, setDialogBillingCycle] = useState(billingCycles[0].value);
    
    // Recalculate costs based on the dialog's state
    const dialogCosts = useMemo(() => {
        if (!finalPlanDetails) return null;
        
        const isFlowPlan = finalPlanDetails.plan.id === 'enterprise-overflow';
        const planBaseCost = isFlowPlan ? 50000 : finalPlanDetails.planBaseCost;

        const addonsCost = addons.reduce((total, addon) => (addon.type === 'checkbox' && finalPlanDetails.selectedAddons[addon.id] ? total + addon.feeValue : total), 0);
        const dispensersCost = finalPlanDetails.additionalDispensers * additionalDispenserCost;
        const litersCost = finalPlanDetails.additionalLiters * additionalLiterCost;

        const subtotal = planBaseCost + addonsCost + dispensersCost + litersCost;
        
        const selectedCycle = billingCycles.find(c => c.value === dialogBillingCycle) || billingCycles[0];
        
        const discount = isFlowPlan ? 0 : selectedCycle.discount;
        const totalBeforeDiscount = isFlowPlan ? planBaseCost : subtotal * selectedCycle.multiplier;
        const discountValue = totalBeforeDiscount * discount;
        const finalAmount = totalBeforeDiscount - discountValue;

        return {
            subtotal: isFlowPlan ? planBaseCost : subtotal,
            discountPercentage: discount * 100,
            discountValue,
            totalAmountDue: finalAmount,
            billingCycleLabel: selectedCycle.label
        };
    }, [finalPlanDetails, dialogBillingCycle]);


    const handleDownloadPdf = async () => {
        const element = proposalRef.current;
        if (!element) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(element, { 
                scale: 2,
                useCORS: true,
             });
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            
            pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
            pdf.save(`Smart-Refill-Proposal-${finalPlanDetails.companyName}.pdf`);
            toast({ title: "Download Started", description: "Your proposal PDF is being generated." });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not generate PDF.' });
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSendEmail = () => {
        toast({ title: "Coming Soon!", description: "This feature will be available in a future update." });
    }

    if (!finalPlanDetails || !dialogCosts) return null;

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Generate Proposal</DialogTitle>
                    <DialogDescription>Review the sales illustration below. You can download it as a PDF or send it via email.</DialogDescription>
                </DialogHeader>
                <div className="md:grid md:grid-cols-4 gap-6 items-start">
                    <div className="md:col-span-1 space-y-4">
                         <Card>
                             <CardHeader>
                                 <CardTitle className="text-base">Payment Schedule</CardTitle>
                             </CardHeader>
                             <CardContent>
                                <RadioGroup value={dialogBillingCycle} onValueChange={setDialogBillingCycle} className="space-y-1">
                                    {billingCycles.map((cycle) => (
                                        <div key={`dialog-${cycle.value}`} className="flex items-center space-x-2">
                                            <RadioGroupItem value={cycle.value} id={`dialog-${cycle.value}`} />
                                            <Label htmlFor={`dialog-${cycle.value}`} className="font-normal flex justify-between w-full">
                                                <span>{cycle.label}</span>
                                                {cycle.discount > 0 && <span className="font-semibold text-green-600">-{cycle.discount * 100}%</span>}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                             </CardContent>
                         </Card>
                         <Card>
                             <CardHeader>
                                 <CardTitle className="text-base">Cost Summary</CardTitle>
                             </CardHeader>
                             <CardContent className="space-y-2 text-sm">
                                 <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(dialogCosts.subtotal)}</span>
                                 </div>
                                 <div className="flex justify-between text-green-600">
                                    <span>Discount ({dialogCosts.discountPercentage}%)</span>
                                    <span>- {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(dialogCosts.discountValue)}</span>
                                 </div>
                                 <Separator />
                                 <div className="flex justify-between font-bold text-base">
                                     <span>Total Due</span>
                                     <span>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(dialogCosts.totalAmountDue)}</span>
                                 </div>
                             </CardContent>
                         </Card>
                    </div>
                    <div className="md:col-span-3 mt-6 md:mt-0">
                        <ScrollArea className="h-[75vh] pr-4 border rounded-lg">
                             <div ref={proposalRef} className="bg-white p-8" id="pdf-content">
                                <ContractDetails
                                    finalPlanDetails={{
                                        ...finalPlanDetails,
                                        billingCycleLabel: dialogCosts.billingCycleLabel,
                                        totalAmountDue: new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(dialogCosts.totalAmountDue),
                                        discount: dialogCosts.discountPercentage / 100,
                                    }}
                                    isSigned={false}
                                    isProposalIllustration={true}
                                />
                            </div>
                        </ScrollArea>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleSendEmail} disabled>
                        <Send className="mr-2 h-4 w-4" /> Send Email (Soon)
                    </Button>
                    <Button onClick={handleDownloadPdf} disabled={isDownloading}>
                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Download PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PreviewDialog({ 
    finalPlanDetails,
    isSaving,
    isDialogOpen,
    setDialogOpen,
    saveProposal,
    signatureData,
    onSaveSignature,
    onClearSignature,
    paymentProofFile,
    setPaymentProofFile,
}: { 
    finalPlanDetails: FinalPlanDetails,
    isSaving: boolean;
    isDialogOpen: boolean;
    setDialogOpen: (open: boolean) => void;
    saveProposal: (status: 'draft' | 'accepted') => Promise<void>;
    signatureData?: string;
    onSaveSignature: (dataUrl: string) => void;
    onClearSignature: () => void;
    paymentProofFile: File | null;
    setPaymentProofFile: (file: File | null) => void;
}) {
    const contractRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);

    const handleSaveDraft = async () => {
      await saveProposal('draft');
    };
    
    const handleFinalize = async () => {
        if (!signatureData) {
            toast({
                variant: "destructive",
                title: "Signature Required",
                description: "Please provide and save a signature before finalizing.",
            });
            return;
        }
        if (!paymentProofFile) {
            toast({
                variant: "destructive",
                title: "Payment Proof Required",
                description: "Please upload your proof of payment to finalize.",
            });
            return;
        }
        await saveProposal('accepted');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setPaymentProofFile(file);
        if (file && file.type.startsWith("image/")) {
            setPaymentProofPreview(URL.createObjectURL(file));
        } else {
            setPaymentProofPreview(null);
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
             <DialogContent className="sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Proposal Preview &amp; Finalization</DialogTitle>
                    <DialogDescription>Review the details, sign the agreement, and upload your payment to complete the process.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[75vh] pr-6">
                    <div ref={contractRef} className="space-y-6">
                        <ContractDetails
                            finalPlanDetails={finalPlanDetails}
                            isSigned={false}
                            signatureData={signatureData}
                            onSaveSignature={onSaveSignature}
                            onClearSignature={onClearSignature}
                        />
                         <Card>
                            <CardHeader>
                                <CardTitle>Final Step: Upload Proof of Payment</CardTitle>
                                <CardDescription>
                                    Please upload a screenshot or document of your payment confirmation. This is required to finalize the proposal.
                                </CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-4">
                                <PaymentMethods />
                                <div className="pt-4 space-y-2">
                                     <Label htmlFor="payment-proof">Payment Confirmation File</Label>
                                     <Input 
                                        id="payment-proof"
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange} 
                                        accept="image/png, image/jpeg, application/pdf"
                                     />
                                     {isSaving && <Progress value={isSaving ? 50 : 0} className="w-full h-2 mt-2" />}
                                     {paymentProofFile && (
                                        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground p-2 bg-muted rounded-md border">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                {paymentProofPreview ? (
                                                    <div className="relative h-10 w-10 flex-shrink-0">
                                                        <Image src={paymentProofPreview} alt="Preview" fill className="object-cover rounded-sm" />
                                                    </div>
                                                ) : (
                                                    <FileCheck className="h-6 w-6 text-green-500 flex-shrink-0" />
                                                )}
                                                <span className="truncate">{paymentProofFile.name}</span>
                                            </div>
                                             {paymentProofPreview && (
                                                 <Dialog>
                                                    <DialogTrigger asChild>
                                                         <Button variant="ghost" size="sm"><Eye className="mr-2 h-4 w-4"/> View</Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Payment Proof Preview</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="relative mt-4 aspect-auto max-h-[70vh] w-full">
                                                            <Image src={paymentProofPreview} alt="Payment proof full preview" width={500} height={700} className="object-contain w-full h-full" />
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                             )}
                                        </div>
                                     )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>
                <DialogFooter className="gap-2 sm:justify-between items-center border-t pt-4">
                     <Button type="button" onClick={handleSaveDraft} variant="outline" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save as Draft
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                                <Button type="button" disabled={isSaving}>
                                <Send className="mr-2 h-4 w-4" />
                                Subscribe to Smart Refill
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Finalize and Subscribe?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will submit your signed contract and proof of payment. This action marks your subscription as active.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleFinalize} disabled={isSaving}>
                                    {isSaving ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                                    ) : (
                                        'Yes, Subscribe Now'
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
  const managerId = searchParams.get('managerId');
  const campaignName = searchParams.get('campaignName');

  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState(billingCycles[0].value);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingIds, setIsGeneratingIds] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<{ [key: string]: boolean }>({
    'weekly-sanitation': false,
  });
  const [additionalDispensers, setAdditionalDispensers] = useState(0);
  const [additionalLiters, setAdditionalLiters] = useState(0);
  const [isReviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [generatedClientId, setGeneratedClientId] = useState<string | undefined>(existingClientId);
  const [generatedProposalId, setGeneratedProposalId] = useState<string | undefined>();
  const [signatureData, setSignatureData] = useState<string | undefined>();
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [_, setForceUpdate] = useState(0);

  const getStations = (liters: number) => {
    if (liters <= 2000) return '1 Station';
    if (liters <= 6000) return '2-3 Stations';
    if (liters <= 25000) return '3-4 Stations';
    return '5+ Stations';
  }

  const getEmployees = (liters: number, isHousehold: boolean) => {
    if (isHousehold) {
        const estimatedPeople = Math.round(liters / (2 * 30)); // Assuming 2L per person per day
        if (estimatedPeople <= 3) return '1-3 Persons';
        if (estimatedPeople <= 5) return '3-5 Persons';
        return '5+ Persons';
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

    if (plan.id === 'enterprise-overflow') {
      return {
        ...plan,
        liters: 'Usage-Based',
      };
    }

    const baseLiters = parseInt(plan.liters.replace(/[^0-9]/g, '')) || 0;
    const freeLiters = baseLiters * 0.2;
    const finalLiters = baseLiters + freeLiters + additionalLiters;
    const planInclusions = plan.inclusions && plan.inclusions.length > 0 ? [plan.inclusions[0]] : [];

    return {
        ...plan,
        liters: `${finalLiters.toLocaleString()} L`,
        inclusions: planInclusions,
        employees: getEmployees(finalLiters, clientType === 'household'),
        stations: clientType === 'household' ? getStations(finalLiters) : plan.stations,
    }
  }, [plan, additionalLiters, clientType]);

  const handleAddonToggle = (addonId: string) => {
    setSelectedAddons(prev => ({...prev, [addonId]: !prev[addonId] }));
  }

  const finalPlanDetails: FinalPlanDetails | null = useMemo(() => {
    if (!plan || !finalPlan) return null;
    
    const isFlowPlan = plan.id === 'enterprise-overflow';
    const planBaseCost = isFlowPlan ? 50000 : (parseFloat(plan.monthlyFee.replace(/[^0-9.-]+/g,"")) || 0);

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
    
    const discount = isFlowPlan ? 0 : selectedCycle.discount;
    const totalBeforeDiscount = isFlowPlan ? planBaseCost : subtotal * selectedCycle.multiplier;
    const discountValue = totalBeforeDiscount * discount;
    const finalAmount = totalBeforeDiscount - discountValue;

    const baseLiters = parseInt(plan.liters.replace(/[^0-9]/g, '')) || 0;
    const freeLiters = baseLiters * 0.2;
    const totalMonthlyLiters = baseLiters + freeLiters + additionalLiters;
    const totalLitersForCycle = isFlowPlan ? 0 : totalMonthlyLiters * selectedCycle.multiplier;
    
    const rotationInfo = gallonRotationData[plan.id] || gallonRotationData['custom-plan'];

    const summaryTitle = plan.name.includes("Plan") ? plan.name : `${plan.name} Plan`;

    return {
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        summaryTitle: summaryTitle,
        totalLiters: isFlowPlan ? 'Usage-Based' : `${totalLitersForCycle.toLocaleString()} L`,
        employees: finalPlan.employees,
        refillableGallons: rotationInfo.gallons > 0 ? `${rotationInfo.gallons}` : 'Dynamic',
        refillFrequency: finalPlan.refillFrequency,
        totalAmountDue: new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(finalAmount),
        billingCycleLabel: selectedCycle.label,
        discount: discount,
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
        signature: signatureData,
    };
  }, [plan, finalPlan, billingCycle, selectedAddons, additionalDispensers, additionalLiters, generatedClientId, generatedProposalId, companyName, contactName, contactEmail, contactPhone, address, clientType, signatureData]);


  const currencyFormatter = new Intl.NumberFormat('en-ph', { style: 'currency', currency: 'php' });
  
  const saveProposal = async (status: 'draft' | 'accepted') => {
    if (!finalPlanDetails || !firestore) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Cannot save proposal without complete plan details or Firestore instance.",
      });
      return;
    }

    const isSubscribing = status === 'accepted';

    if (isSubscribing && !paymentProofFile) {
        toast({
            variant: "destructive",
            title: "Payment Proof Required",
            description: "Please upload your proof of payment to subscribe.",
        });
        return;
    }

    const proposalOwnerId = managerId || user?.uid;
    if (!proposalOwnerId) {
       toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "Could not determine the proposal owner. Please ensure you are logged in.",
      });
      return;
    }
  
    setIsSaving(true);
    let finalClientId = generatedClientId;
    const onboardingToken = crypto.randomUUID();
  
    try {
      if (!finalClientId) {
        if (existingClientId) {
          finalClientId = existingClientId;
        } else {
          toast({ variant: "destructive", title: "Save Failed", description: "Client ID has not been generated." });
          setIsSaving(false);
          return;
        }
      }
      
      const proposalId = generatedProposalId;
      if (!proposalId) {
        toast({ variant: "destructive", title: "Save Failed", description: "Proposal ID has not been generated." });
        setIsSaving(false);
        return;
      }
      
      let downloadURL = '';
      if (paymentProofFile) {
        const storage = getStorage();
        const filePath = `payment_proofs/${finalClientId}/${proposalId}/${paymentProofFile.name}`;
        const storageRef = ref(storage, filePath);
        const snapshot = await uploadBytes(storageRef, paymentProofFile);
        downloadURL = await getDownloadURL(snapshot.ref);
      }
      
      const clientRef = doc(firestore, 'clients', finalClientId);
      const clientData: any = {
        id: finalClientId,
        userId: proposalOwnerId,
        companyName: companyName,
        contactName: contactName,
        contactEmail: contactEmail,
        contactPhone: contactPhone,
        address: address,
        clientType: clientType || 'sme',
        onboardingToken: onboardingToken,
      };

      if (isSubscribing) {
          clientData.status = 'active';
          clientData.paymentStatus = 'Paid';
          clientData.subscription = {
            ...finalPlanDetails.plan,
            dateSigned: new Date().toISOString()
          }
      } else {
          clientData.status = 'pending';
      }

      if (!existingClientId) {
        clientData.createdAt = serverTimestamp();
        await setDoc(clientRef, clientData, { merge: true });
      } else {
        await updateDoc(clientRef, clientData);
      }
      
      const proposalContentToSave: FinalPlanDetails = { ...finalPlanDetails, signature: signatureData };
      const amountToSave = parseFloat(proposalContentToSave.totalAmountDue.replace(/[^0-9.-]+/g, ""));
      
      const newProposalData: any = {
        id: proposalId,
        clientId: finalClientId,
        userId: proposalOwnerId,
        title: proposalContentToSave.summaryTitle,
        content: JSON.stringify(proposalContentToSave),
        status: status,
        amount: amountToSave,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (campaignName) {
        newProposalData.sourceLocation = campaignName;
      }
      
      if(downloadURL) {
        newProposalData.paymentProofUrl = downloadURL;
      }

      const proposalRef = doc(firestore, `clients/${finalClientId}/proposals`, proposalId);
      await setDoc(proposalRef, newProposalData, { merge: true });
  
      toast({
        title: status === 'draft' ? "Proposal Saved!" : "Subscription Successful!",
        description: `Your proposal for ${companyName} has been saved.`,
      });
      
      if (isSubscribing) {
          router.push(`/onboarding/status?client_id=${finalClientId}&proposal_id=${proposalId}&token=${onboardingToken}`);
      } else {
          router.push('/dashboard/proposals');
      }
  
    } catch (error) {
        console.error("Error saving proposal:", error);
        if (!(error instanceof FirestorePermissionError)) {
          toast({
            variant: "destructive",
            title: "Save Failed",
            description: (error as Error).message || "An error occurred while saving the proposal.",
          });
        }
    } finally {
      setIsSaving(false);
    }
  };


  const handleActionClick = async () => {
    if (!firestore) return;
    setIsGeneratingIds(true);

    try {
        await runTransaction(firestore, async (transaction) => {
            const proposalCounterRef = doc(firestore, 'counters', 'proposalCounter');
            let newProposalNumber;
            if(!generatedProposalId) {
                const proposalCounterSnap = await transaction.get(proposalCounterRef);
                newProposalNumber = proposalCounterSnap.exists() ? proposalCounterSnap.data().currentId + 1 : 1;
                const newProposalId = String(newProposalNumber).padStart(10, '0');
                setGeneratedProposalId(newProposalId);
                transaction.set(proposalCounterRef, { currentId: newProposalNumber }, { merge: true });
            }
            
            if (!existingClientId && !generatedClientId) {
                const clientCounterRef = doc(firestore, 'counters', 'clientCounter');
                const clientCounterSnap = await transaction.get(clientCounterRef);
                const newClientNumber = clientCounterSnap.exists() ? clientCounterSnap.data().currentId + 1 : 1;
                const year = new Date().getFullYear().toString().slice(-2);
                const finalClientId = `SC${year}${String(newClientNumber).padStart(8, '0')}`;
                setGeneratedClientId(finalClientId);
                transaction.set(clientCounterRef, { currentId: newClientNumber }, { merge: true });
            }
        });

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
  
    const handleSaveSignature = (data: string) => {
        setSignatureData(data);
        toast({
            title: "Signature Saved",
            description: "Your signature has been captured and is ready to be included in the final proposal.",
        });
        setForceUpdate(v => v + 1);
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

  const isFlowPlan = plan.id === 'enterprise-overflow';
  const rotationInfo = gallonRotationData[plan.id] || gallonRotationData['custom-plan'];
  const summaryTitle = plan.name.includes("Plan") ? plan.name : `${plan.name} Plan`;
  const prevLink = `/dashboard/proposals/new/plans?${searchParams.toString()}`;
  const selectedCycle = billingCycles.find(c => c.value === billingCycle) || billingCycles[0];

  const clientTypeMap: { [key: string]: string } = {
    household: 'Family',
    sme: 'SME',
    commercial: 'Commercial',
    corporate: 'Corporate',
    enterprise: 'Enterprise'
  };

  const getClientTypeLabel = (type: Client['clientType']) => {
    if (!type) return 'Employees'; // Default label
    if (type === 'household') return 'Family';
    return 'Employees';
  };

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
             <GenerateProposalDialog finalPlanDetails={finalPlanDetails}>
                <Button variant="outline" onClick={handleActionClick} disabled={isGeneratingIds}>
                    {isGeneratingIds && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Proposal
                </Button>
            </GenerateProposalDialog>
            <Button onClick={() => { handleActionClick().then(() => setReviewDialogOpen(true)) }} disabled={isSaving || isGeneratingIds}>
                {(isSaving || isGeneratingIds) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Review &amp; Sign
            </Button>
        </div>
      </div>

       {finalPlanDetails && (
            <PreviewDialog 
                finalPlanDetails={finalPlanDetails}
                isSaving={isSaving}
                isDialogOpen={isReviewDialogOpen}
                setDialogOpen={setReviewDialogOpen}
                saveProposal={saveProposal}
                signatureData={signatureData}
                onSaveSignature={handleSaveSignature}
                onClearSignature={() => setSignatureData(undefined)}
                paymentProofFile={paymentProofFile}
                setPaymentProofFile={setPaymentProofFile}
            />
       )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Plan Summary: {summaryTitle}</CardTitle>
                    <CardDescription>
                        A summary of the selected subscription plan details.
                        {!isFlowPlan && " (Includes +20% free liters every month)"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-primary text-primary-foreground">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{isFlowPlan ? 'Usage-Based' : 'Total Liters'}</CardTitle>
                                <Waves className="h-4 w-4 text-primary-foreground/70" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{finalPlan.liters}{isFlowPlan ? '' : ' / mo'}</div>
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

            {!isFlowPlan && (
                <Card>
                    <CardHeader>
                        <CardTitle>Optional Add-Ons</CardTitle>
                        <CardDescription>
                        Enhance your Smart Refill experience with premium service options.
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
            )}

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
                            description="Client portal is set up within 12 hours of signing and making payment."
                        />
                        <TimelineItem 
                            icon={<CalendarCheck className="h-5 w-5" />}
                            title="Onboarding"
                            description="Initial delivery schedule confirmed within 12 hours."
                        />
                        <TimelineItem 
                            icon={<Ship className="h-5 w-5" />}
                            title="First Delivery"
                            description="Equipment and first water batch delivered within 24 hours of signing."
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

            <PaymentMethods />
        </div>
        
        <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle>Summary &amp; Final Amount</CardTitle>
                <CardDescription>Review the final costs before proceeding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div>
                        <p className="font-semibold">{summaryTitle}{!isFlowPlan && ` (${finalPlanDetails.billingCycleLabel})`}</p>
                        <p className="text-2xl font-bold">{isFlowPlan ? currencyFormatter.format(50000) : currencyFormatter.format(finalPlanDetails.basePrice)}
                          {isFlowPlan ? <span className="text-sm font-normal text-muted-foreground"> Top-Up</span> : <span className="text-sm font-normal text-muted-foreground"> / mo</span>}
                        </p>
                    </div>
                    <ul className="text-xs text-muted-foreground list-disc pl-5">
                        <li>Total Liters: {finalPlan.liters} {isFlowPlan ? '' : '/ mo (includes 20% bonus)'}</li>
                        {finalPlan.inclusions && finalPlan.inclusions[0] && <li>{finalPlan.inclusions[0]}</li>}
                        <li>Refill Frequency: {finalPlan.refillFrequency}</li>
                    </ul>
                </div>

                {!isFlowPlan && (
                    <>
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
                                        <RadioGroupItem value={cycle.value} id={cycle.value} disabled={isFlowPlan}/>
                                        <Label htmlFor={cycle.value} className="font-normal flex justify-between w-full">
                                            <span>{cycle.label}</span>
                                            {cycle.discount > 0 && <span className="font-semibold text-green-600">-{cycle.discount * 100}%</span>}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    </>
                )}

                <Separator />

                <div className="flex justify-between items-center font-bold text-lg p-4 bg-muted rounded-lg">
                    <span>Total Due</span>
                    <span>{finalPlanDetails.totalAmountDue}</span>
                </div>
            </CardContent>
        </Card>
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

