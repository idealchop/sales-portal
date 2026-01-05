
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
    id: 'monthly-sanitation',
    name: 'Monthly Sanitation',
    description: 'Guaranteed monthly sanitation and equipment check-up for high-traffic areas.',
    feeValue: 500,
    type: 'configurable',
  },
  {
    id: 'additional-dispensers',
    name: 'Additional Dispensers',
    description: 'Rent extra dispensers for more convenience.',
    type: 'custom',
    feeOptions: [
        { value: 'monthly', label: 'Monthly Fee', defaultCost: 250 },
        { value: 'security', label: 'Security Deposit', defaultCost: 1000 },
        { value: 'free', label: 'Free', defaultCost: 0 },
    ],
  },
];


function GenerateProposalDialog({ finalPlanDetails, children }: { finalPlanDetails: FinalPlanDetails, children: React.ReactNode }) {
    const hiddenProposalRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [isDownloading, setIsDownloading] = useState(false);
    
    // State for the dialog's payment schedule
    const [dialogBillingCycle, setDialogBillingCycle] = useState(finalPlanDetails.billingCycleLabel.toLowerCase() || billingCycles[0].value);
    
    // Recalculate costs based on the dialog's state
    const dialogCosts = useMemo(() => {
        if (!finalPlanDetails) return null;
        
        const isFlowPlan = finalPlanDetails.plan.id === 'enterprise-overflow';
        const isCustomPlan = finalPlanDetails.plan.id === 'custom-plan';
        const planBaseCost = isFlowPlan ? 50000 : finalPlanDetails.planBaseCost;

        const sanitationCost = finalPlanDetails.sanitationFeeType === 'paid' ? finalPlanDetails.sanitationFee : 0;
        const dispensersCost = (finalPlanDetails.additionalDispensers as any).quantity * (finalPlanDetails.additionalDispensers as any).fee;

        const subtotal = planBaseCost + sanitationCost + dispensersCost;
        
        const selectedCycle = billingCycles.find(c => c.value === dialogBillingCycle) || billingCycles[0];
        
        const discount = isFlowPlan || isCustomPlan ? 0 : selectedCycle.discount;
        const totalBeforeDiscount = isFlowPlan || isCustomPlan ? planBaseCost : subtotal * selectedCycle.multiplier;
        const discountValue = totalBeforeDiscount * discount;
        const finalAmount = totalBeforeDiscount - discountValue;

        return {
            subtotal: isFlowPlan || isCustomPlan ? planBaseCost : subtotal,
            discountPercentage: discount * 100,
            discountValue,
            totalAmountDue: finalAmount,
            billingCycleLabel: selectedCycle.label
        };
    }, [finalPlanDetails, dialogBillingCycle]);


    const handleDownloadPdf = async () => {
        const element = hiddenProposalRef.current;
        if (!element) return;
        setIsDownloading(true);

        try {
            element.style.display = 'block';
            
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
            });

            element.style.display = 'none';
            
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / pdfWidth;
            const imgHeight = canvasHeight / ratio;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.setTextColor(150);
                pdf.text(
                    `Page ${i} of ${totalPages}`,
                    pdf.internal.pageSize.getWidth() - 20,
                    pdf.internal.pageSize.getHeight() - 10
                );
            }

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
    const isCustom = finalPlanDetails.plan.id === 'custom-plan';
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

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
                                <RadioGroup value={dialogBillingCycle} onValueChange={setDialogBillingCycle} className="space-y-1" disabled={isCustom}>
                                    {billingCycles.map((cycle) => (
                                        <div key={`dialog-${cycle.value}`} className="flex items-center space-x-2">
                                            <RadioGroupItem value={cycle.value} id={`dialog-${cycle.value}`} />
                                            <Label htmlFor={`dialog-${cycle.value}`} className="font-normal flex justify-between w-full">
                                                <span>{cycle.label}</span>
                                                {cycle.discount > 0 && <Badge variant="success">-{cycle.discount * 100}%</Badge>}
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
                                {!isCustom &&
                                    <>
                                        <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal ({dialogCosts.billingCycleLabel})</span>
                                        <span>{currencyFormatter.format(dialogCosts.subtotal * (billingCycles.find(c=>c.value === dialogBillingCycle)?.multiplier || 1))}</span>
                                        </div>
                                        {dialogCosts.discountValue > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <span className="text-muted-foreground">Discount ({dialogCosts.discountPercentage}%)</span>
                                            <span>- {currencyFormatter.format(dialogCosts.discountValue)}</span>
                                        </div>
                                        )}
                                        <Separator />
                                    </>
                                }
                                <div className="flex justify-between font-bold text-base">
                                    <span>{isCustom ? 'Price per Liter' : 'Total Due'}</span>
                                    <span>{isCustom ? `${currencyFormatter.format(finalPlanDetails.pricePerLiter || 0)}/L` : currencyFormatter.format(dialogCosts.totalAmountDue)}</span>
                                </div>
                            </CardContent>
                         </Card>
                    </div>
                    <div className="md:col-span-3 mt-6 md:mt-0">
                        <ScrollArea className="h-[75vh] pr-4 border rounded-lg">
                             <div className="bg-white p-8" id="pdf-content-preview">
                                <ContractDetails
                                    finalPlanDetails={{
                                        ...finalPlanDetails,
                                        billingCycleLabel: isCustom ? "Usage-Based" : dialogCosts.billingCycleLabel,
                                        totalAmountDue: isCustom ? "Usage-Based" : currencyFormatter.format(dialogCosts.totalAmountDue),
                                        discount: dialogCosts.discountPercentage / 100,
                                    }}
                                    isSigned={false}
                                    isProposalIllustration={true}
                                />
                            </div>
                        </ScrollArea>
                        {/* Hidden div for PDF generation */}
                         <div ref={hiddenProposalRef} style={{ display: 'none', position: 'absolute', left: '-9999px', width: '8.5in' }} className="p-12 bg-white text-black">
                            <ContractDetails
                                finalPlanDetails={{
                                    ...finalPlanDetails,
                                    billingCycleLabel: isCustom ? "Usage-Based" : dialogCosts.billingCycleLabel,
                                    totalAmountDue: isCustom ? "Usage-Based" : currencyFormatter.format(dialogCosts.totalAmountDue),
                                    discount: dialogCosts.discountPercentage / 100,
                                }}
                                isSigned={false}
                                isProposalIllustration={true}
                            />
                        </div>
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
                    <DialogTitle>Proposal Preview & Finalization</DialogTitle>
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
  const dispensers = searchParams.get('dispensers');
  const containers = searchParams.get('containers');

  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState(billingCycles[0].value);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingIds, setIsGeneratingIds] = useState(false);
  
  const [sanitationFeeType, setSanitationFeeType] = useState('free');
  const [sanitationFee, setSanitationFee] = useState(500);

  const [dispenserFeeType, setDispenserFeeType] = useState('monthly');
  const [dispenserQuantity, setDispenserQuantity] = useState(0);
  const [dispenserFee, setDispenserFee] = useState(250);

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
        inclusions: ['Pay only for what you use'],
      };
    }

    const baseLiters = parseInt(plan.liters.replace(/[^0-9]/g, '')) || 0;
    const freeLiters = baseLiters * 0.2;
    const finalLiters = baseLiters + freeLiters;
    const planInclusions = plan.inclusions && plan.inclusions.length > 0 ? [plan.inclusions[0]] : [];

    return {
        ...plan,
        liters: `${finalLiters.toLocaleString()} L`,
        inclusions: planInclusions,
        employees: getEmployees(finalLiters, clientType === 'household'),
        stations: clientType === 'household' ? getStations(finalLiters) : plan.stations,
    }
  }, [plan, clientType]);

  const finalPlanDetails: FinalPlanDetails | null = useMemo(() => {
    if (!plan || !finalPlan) return null;
    
    const isFlowPlan = plan.id === 'enterprise-overflow';
    const isCustomPlan = plan.id === 'custom-plan';
    const planBaseCost = isFlowPlan ? 50000 : (parseFloat(plan.monthlyFee.replace(/[^0-9.-]+/g,"")) || 0);

    const sanitationCost = sanitationFeeType === 'paid' ? sanitationFee : 0;
    const dispensersCost = dispenserFeeType === 'monthly' ? dispenserQuantity * dispenserFee : 0;
    const dispensersSecurityCost = dispenserFeeType === 'security' ? dispenserQuantity * dispenserFee : 0;

    const subtotal = planBaseCost + sanitationCost + dispensersCost;
    
    const selectedCycle = billingCycles.find(c => c.value === billingCycle) || billingCycles[0];
    
    const discount = isFlowPlan || isCustomPlan ? 0 : selectedCycle.discount;
    const totalBeforeDiscount = isFlowPlan || isCustomPlan ? planBaseCost : subtotal * selectedCycle.multiplier;
    const discountValue = totalBeforeDiscount * discount;
    const finalAmount = totalBeforeDiscount - discountValue + dispensersSecurityCost;

    const baseLiters = parseInt(plan.liters.replace(/[^0-9]/g, '')) || 0;
    const freeLiters = baseLiters * 0.2;
    const totalMonthlyLiters = baseLiters + freeLiters;
    const totalLitersForCycle = isFlowPlan ? 'Usage-Based' : `${(totalMonthlyLiters * selectedCycle.multiplier).toLocaleString()} L`;
    
    const rotationInfo = gallonRotationData[plan.id] || gallonRotationData['custom-plan'];

    const summaryTitle = plan.name.includes("Plan") ? plan.name : `${plan.name} Plan`;

    const pricePerLiter = (customCost && customLiters) ? parseFloat(customCost) / parseInt(customLiters) : 0;

    return {
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        summaryTitle: summaryTitle,
        totalLiters: totalLitersForCycle,
        employees: finalPlan.employees,
        refillableGallons: rotationInfo.gallons > 0 ? `${rotationInfo.gallons}` : 'Dynamic',
        refillFrequency: finalPlan.refillFrequency,
        totalAmountDue: isCustomPlan ? "Usage-Based" : new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(finalAmount),
        billingCycleLabel: isCustomPlan ? "Usage-Based" : selectedCycle.label,
        discount: discount,
        basePrice: subtotal,
        selectedAddons: { 'monthly-sanitation': sanitationFeeType === 'paid' },
        sanitationFeeType,
        sanitationFee,
        additionalDispensers: {
            quantity: dispenserQuantity,
            feeType: dispenserFeeType,
            fee: dispenserFee,
        },
        plan,
        finalPlan,
        planBaseCost,
        addons,
        additionalDispenserCost: 0,
        additionalLiterCost: 0,
        totalMonthlyLiters,
        totalLitersForCycle: isFlowPlan ? 0 : (totalMonthlyLiters * selectedCycle.multiplier),
        clientId: generatedClientId,
        proposalId: generatedProposalId,
        companyName,
        contactName,
        contactEmail,
        contactPhone,
        address,
        clientType,
        signature: signatureData,
        pricePerLiter: isCustomPlan ? pricePerLiter : undefined,
        dispensers: parseInt(dispensers || '0'),
        containers: parseInt(containers || '0'),
    };
  }, [plan, finalPlan, billingCycle, sanitationFeeType, sanitationFee, dispenserQuantity, dispenserFeeType, dispenserFee, generatedClientId, generatedProposalId, companyName, contactName, contactEmail, contactPhone, address, clientType, signatureData, customCost, customLiters, dispensers, containers]);


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
    const isCustomPlan = finalPlanDetails.plan.id === 'custom-plan';

    if (isSubscribing && !isCustomPlan && !paymentProofFile) {
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
          clientData.paymentStatus = isCustomPlan ? 'Paid' : 'Paid';
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
      const amountToSave = isCustomPlan ? 0 : parseFloat(String(proposalContentToSave.totalAmountDue).replace(/[^0-9.-]+/g, ""));
      
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


  const handleActionClick = async (action: 'generate' | 'sign') => {
    setIsGeneratingIds(true);
    try {
        if (!firestore) {
            throw new Error("Firestore not initialized.");
        }
        await runTransaction(firestore, async (transaction) => {
            if (!generatedProposalId) {
                const proposalCounterRef = doc(firestore, 'counters', 'proposalCounter');
                const proposalCounterSnap = await transaction.get(proposalCounterRef);
                const newProposalNumber = proposalCounterSnap.exists() ? proposalCounterSnap.data().currentId + 1 : 1;
                const newProposalId = String(newProposalNumber).padStart(10, '0');
                transaction.set(proposalCounterRef, { currentId: newProposalNumber }, { merge: true });
                setGeneratedProposalId(newProposalId);
            }

            if (action === 'sign' && !existingClientId && !generatedClientId) {
                const clientCounterRef = doc(firestore, 'counters', 'clientCounter');
                const clientCounterSnap = await transaction.get(clientCounterRef);
                const newClientNumber = clientCounterSnap.exists() ? clientCounterSnap.data().currentId + 1 : 1;
                const year = new Date().getFullYear().toString().slice(-2);
                const newClientId = `SC${year}${String(newClientNumber).padStart(8, '0')}`;
                transaction.set(clientCounterRef, { currentId: newClientNumber }, { merge: true });
                setGeneratedClientId(newClientId);
            }
        });

        if (action === 'generate') {
            document.getElementById('generate-proposal-trigger')?.click();
        } else if (action === 'sign') {
            setReviewDialogOpen(true);
        }

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
  const isCustomPlan = plan.id === 'custom-plan';
  const rotationInfo = gallonRotationData[plan.id] || gallonRotationData['custom-plan'];
  const summaryTitle = plan.name.includes("Plan") ? plan.name : `${plan.name} Plan`;
  const prevLink = `/dashboard/proposals/new/plans?${searchParams.toString()}`;
  const selectedCycle = billingCycles.find(c => c.value === billingCycle) || billingCycles[0];
  const discountValue = isFlowPlan || isCustomPlan ? 0 : (finalPlanDetails.basePrice * selectedCycle.multiplier) * selectedCycle.discount;


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
  
  const pricePerLiter = finalPlanDetails.pricePerLiter || 0;

  return (
    <div className="flex flex-col gap-6 pb-24 sm:pb-0">
       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finalize Proposal</h1>
          <p className="text-muted-foreground">
            Step 5: Review inclusions, add-ons, and sign the agreement.
          </p>
        </div>
         <div className="hidden sm:flex flex-col sm:flex-row gap-2">
            <Button variant="outline" asChild>
                <Link href={prevLink}>Previous</Link>
            </Button>
             <GenerateProposalDialog finalPlanDetails={finalPlanDetails}>
                <Button id="generate-proposal-trigger" variant="outline" onClick={() => handleActionClick('generate')} disabled={isGeneratingIds}>
                    {isGeneratingIds && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Proposal
                </Button>
            </GenerateProposalDialog>
            <Button onClick={() => handleActionClick('sign')} disabled={isSaving || isGeneratingIds}>
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
                        {!isFlowPlan && !isCustomPlan && " (Includes +20% free liters every month)"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-primary text-primary-foreground">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {isFlowPlan ? 'Usage-Based' : (isCustomPlan ? 'Price per Liter' : 'Premium Liters Included')}
                                </CardTitle>
                                <Waves className="h-4 w-4 text-primary-foreground/70" />
                            </CardHeader>
                            <CardContent>
                                {isCustomPlan ? (
                                    <>
                                        <div className="text-2xl font-bold">{currencyFormatter.format(pricePerLiter)}</div>
                                        <p className="text-xs text-primary-foreground/80">Est. {finalPlan.liters} / mo</p>
                                    </>
                                ) : (
                                    <div className="text-2xl font-bold">{finalPlan.liters}{isFlowPlan ? '' : ' / mo'}</div>
                                )}
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
                                    {isCustomPlan && finalPlanDetails.containers ? `${finalPlanDetails.containers} Gallons` : (rotationInfo && rotationInfo.gallons > 0 ? `${rotationInfo.gallons} Gallons` : 'Dynamic')}
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
                        <TableHead>Add-On</TableHead>
                        <TableHead className="w-[250px]">Configuration</TableHead>
                        <TableHead className="text-right">Fee</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {addons.map((addon) => (
                        <TableRow key={addon.id}>
                            <TableCell>
                                <Label htmlFor={addon.id} className="font-semibold">{addon.name}</Label>
                                <p className="text-muted-foreground text-xs mt-1">{addon.description}</p>
                            </TableCell>
                            <TableCell>
                                {addon.type === 'configurable' && (
                                    <div className="flex flex-col gap-2">
                                        <Select value={sanitationFeeType} onValueChange={setSanitationFeeType}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="paid">Paid</SelectItem>
                                                <SelectItem value="free">Free</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {sanitationFeeType === 'paid' && (
                                            <Input type="number" min="0" value={sanitationFee} onChange={e => setSanitationFee(Number(e.target.value))} placeholder="Fee" />
                                        )}
                                    </div>
                                )}
                                {addon.type === 'custom' && (
                                    <div className="flex flex-col gap-2">
                                        <Select value={dispenserFeeType} onValueChange={setDispenserFeeType}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {addon.feeOptions?.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <div className="flex items-center gap-2">
                                            <Input type="number" min="0" value={dispenserQuantity} onChange={e => setDispenserQuantity(Number(e.target.value))} placeholder="Qty" className="w-16"/>
                                            <Input type="number" min="0" value={dispenserFee} onChange={e => setDispenserFee(Number(e.target.value))} placeholder="Fee" className="flex-1"/>
                                        </div>
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                {addon.type === 'configurable' ? (sanitationFeeType === 'free' ? 'Free' : currencyFormatter.format(sanitationFee)) : 'Custom'}
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>

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
                        <p className="font-semibold">{summaryTitle}{!isFlowPlan && !isCustomPlan && ` (${finalPlanDetails.billingCycleLabel})`}</p>
                        <p className="text-2xl font-bold">
                          {isFlowPlan ? currencyFormatter.format(50000) : (isCustomPlan ? `${currencyFormatter.format(pricePerLiter)}/L` : currencyFormatter.format(finalPlanDetails.basePrice))}
                          {isFlowPlan ? <span className="text-sm font-normal text-muted-foreground"> Top-Up</span> : (!isCustomPlan ? <span className="text-sm font-normal text-muted-foreground"> / mo</span> : '')}
                        </p>
                    </div>
                    {(!isFlowPlan && !isCustomPlan) && (
                        <ul className="text-xs text-muted-foreground list-disc pl-5">
                            <li>Total Liters: {finalPlan.liters === 'Usage-Based' ? 'Usage-Based' : `${finalPlan.liters} / mo (includes 20% bonus)`}</li>
                            {finalPlan.inclusions && finalPlan.inclusions[0] && <li>{finalPlan.inclusions[0]}</li>}
                            <li>Refill Frequency: {finalPlan.refillFrequency}</li>
                        </ul>
                    )}
                </div>

                {(!isFlowPlan || isCustomPlan) && (
                    <>
                        <div className="space-y-2">
                            {sanitationFeeType === 'paid' && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Monthly Sanitation</span>
                                    <span className="font-medium">{currencyFormatter.format(sanitationFee)}</span>
                                </div>
                            )}
                            {dispenserQuantity > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Add'l Dispensers ({dispenserQuantity}x)</span>
                                    <span className="font-medium">{dispenserFeeType === 'free' ? 'Free' : currencyFormatter.format(dispenserFee * dispenserQuantity)}</span>
                                </div>
                            )}
                        </div>
                        
                        <Separator />
                        
                        <div className='space-y-2'>
                            <Label>Payment Schedule</Label>
                            <RadioGroup value={billingCycle} onValueChange={setBillingCycle} className="space-y-1" disabled={isFlowPlan || isCustomPlan}>
                                {billingCycles.map((cycle) => (
                                    <div key={cycle.value} className="flex items-center space-x-2">
                                        <RadioGroupItem value={cycle.value} id={cycle.value} disabled={isFlowPlan || isCustomPlan}/>
                                        <Label htmlFor={cycle.value} className="font-normal flex justify-between w-full">
                                            <span>{cycle.label}</span>
                                            {cycle.discount > 0 && <Badge variant="success">-{cycle.discount * 100}%</Badge>}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    </>
                )}

                <Separator />
                
                <div className="flex justify-between items-center font-bold text-lg p-4 bg-muted rounded-lg">
                    <span>{isCustomPlan ? 'Billed by Consumption' : 'Total Due'}</span>
                    <span>{isCustomPlan ? `${currencyFormatter.format(pricePerLiter)}/L` : finalPlanDetails.totalAmountDue}</span>
                </div>
            </CardContent>
        </Card>
      </div>

       <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-10">
          <div className="flex gap-2">
              <Button variant="outline" asChild className="flex-1">
                  <Link href={prevLink}>Previous</Link>
              </Button>
              <Button onClick={() => handleActionClick('sign')} disabled={isSaving || isGeneratingIds} className="flex-1">
                {(isSaving || isGeneratingIds) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Review &amp; Sign
              </Button>
          </div>
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
    

    
