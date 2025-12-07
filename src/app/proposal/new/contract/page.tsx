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
import { Download, Send, Rocket, Computer, CalendarClock, RotateCw, AreaChart, Thermometer, Wrench, CircleHelp, Phone, Users, Waves, Package, CheckCircle, CalendarCheck, Ship, Bot, Save, HeartPulse, Coffee, Building, Car, RefreshCcw, CreditCard, Loader2, FileCheck, FileText } from 'lucide-react';
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
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, serverTimestamp, addDoc, doc, setDoc, runTransaction, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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
    saveProposal: (status: 'draft' | 'finalized') => Promise<void>;
    signatureData?: string;
    onSaveSignature: (dataUrl: string) => void;
    onClearSignature: () => void;
    paymentProofFile: File | null;
    setPaymentProofFile: (file: File | null) => void;
}) {
    const contractRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [isDownloading, setIsDownloading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        await saveProposal('finalized');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPaymentProofFile(e.target.files ? e.target.files[0] : null);
    };

    const handleDownloadPdf = async () => {
        const contentToCapture = contractRef.current;
        if (!contentToCapture) {
            toast({ variant: "destructive", title: "Download Failed", description: "Contract content container not found." });
            return;
        }
        
        setIsDownloading(true);
        
        try {
            const canvas = await html2canvas(contentToCapture, {
                scale: 2, 
                useCORS: true, 
                allowTaint: true, 
                onclone: (document) => {
                    const imagePromises: Promise<void>[] = [];
                    const images = document.getElementsByTagName('img');
                    for (let i = 0; i < images.length; i++) {
                        const img = images[i];
                        if (img.complete) continue; 
                        
                        imagePromises.push(new Promise((resolve) => {
                            img.onload = () => resolve();
                            img.onerror = () => resolve();
                        }));
                    }
                    return Promise.all(imagePromises);
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const contentWidth = canvas.width;
            const contentHeight = canvas.height;
            
            const ratio = contentWidth / pdfWidth;
            const imgHeight = contentHeight / ratio;
            
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = -pdfHeight + position;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save(`Smart-Refill-Proposal-${finalPlanDetails.proposalId}.pdf`);

        } catch (error) {
            console.error("PDF Download Error:", error);
            toast({ variant: "destructive", title: "Download Failed", description: "An error occurred while generating the PDF." });
        } finally {
            setIsDownloading(false);
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
                                     {paymentProofFile && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted rounded-md">
                                            <FileCheck className="h-4 w-4 text-green-500" />
                                            <span>{paymentProofFile.name}</span>
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
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                             Close
                        </Button>
                        
                        <Button type="button" onClick={handleDownloadPdf} variant="outline" disabled={isSaving || isDownloading}>
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Download PDF
                        </Button>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button type="button" disabled={isSaving}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Finalize &amp; Submit
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Finalize and Submit Proposal?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will submit your signed contract and proof of payment. The proposal will be sent to the sales team for final confirmation.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleFinalize} disabled={isSaving}>
                                        {isSaving ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                                        ) : (
                                            'Yes, Submit Now'
                                        )}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
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
  const [isDialogOpen, setDialogOpen] = useState(false);
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
        stations: clientType === 'household' ? getStations(finalLiters) : plan.stations,
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
        signature: signatureData,
    };
  }, [plan, finalPlan, billingCycle, selectedAddons, additionalDispensers, additionalLiters, generatedClientId, generatedProposalId, companyName, contactName, contactEmail, contactPhone, address, clientType, signatureData]);


  const currencyFormatter = new Intl.NumberFormat('en-ph', { style: 'currency', currency: 'php' });
  
  const saveProposal = async (status: 'draft' | 'finalized') => {
    if (!finalPlanDetails || !firestore) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Cannot save proposal without complete plan details or Firestore instance.",
      });
      return;
    }

    if (status === 'finalized' && !paymentProofFile) {
        toast({
            variant: "destructive",
            title: "Payment Proof Required",
            description: "Please upload your proof of payment to finalize.",
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
  
      if (!existingClientId) {
        const newClientData = {
          id: finalClientId,
          userId: proposalOwnerId,
          companyName: companyName,
          contactName: contactName,
          contactEmail: contactEmail,
          contactPhone: contactPhone,
          address: address,
          clientType: clientType || 'sme',
          status: 'pending',
          createdAt: serverTimestamp(),
        };
        await setDoc(clientRef, newClientData, { merge: true });
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
      setDoc(proposalRef, newProposalData, { merge: true }).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: proposalRef.path,
          operation: 'write', 
          requestResourceData: newProposalData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  
      toast({
        title: status === 'draft' ? "Proposal Saved!" : "Proposal Submitted!",
        description: `Your proposal for ${companyName} has been successfully submitted for review.`,
      });
      
      if (status === 'finalized') {
          router.push(`/onboarding/status?client_id=${finalClientId}`);
      } else {
          router.push('/dashboard/proposals');
      }
  
    } catch (error) {
        console.error("Error saving proposal:", error);
        if (!(error instanceof FirestorePermissionError)) { // Avoid double-toasting
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


  const handleReviewAndSignClick = async () => {
    if (!firestore) return;
    setIsGeneratingIds(true);

    try {
        await runTransaction(firestore, async (transaction) => {
            const proposalCounterRef = doc(firestore, 'counters', 'proposalCounter');
            const clientCounterRef = doc(firestore, 'counters', 'clientCounter');
            
            const proposalCounterSnap = await transaction.get(proposalCounterRef);
            let clientCounterSnap;
            if (!existingClientId && !generatedClientId) {
                clientCounterSnap = await transaction.get(clientCounterRef);
            }

            let finalClientId = generatedClientId;
            let newClientNumber;
            if (clientCounterSnap && clientCounterSnap.exists()) {
                newClientNumber = clientCounterSnap.data().currentId + 1;
                const year = new Date().getFullYear().toString().slice(-2);
                finalClientId = `SC${year}${String(newClientNumber).padStart(8, '0')}`;
            } else if (clientCounterSnap) {
                 newClientNumber = 1;
                 const year = new Date().getFullYear().toString().slice(-2);
                 finalClientId = `SC${year}${String(newClientNumber).padStart(8, '0')}`;
            }
            
            const newProposalNumber = proposalCounterSnap.exists() ? proposalCounterSnap.data().currentId + 1 : 1;
            const newProposalId = String(newProposalNumber).padStart(10, '0');

            if (newClientNumber) {
                transaction.set(clientCounterRef, { currentId: newClientNumber }, { merge: true });
                setGeneratedClientId(finalClientId);
            }
            transaction.set(proposalCounterRef, { currentId: newProposalNumber }, { merge: true });
            setGeneratedProposalId(newProposalId);
        });

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
                        <Link href="/proposal/new/plans">Go to Plans</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
  }

  const rotationInfo = gallonRotationData[plan.id] || gallonRotationData['custom-plan'];
  
  const summaryTitle = plan.name.includes("Plan") ? plan.name : `${plan.name} Plan`;

  const prevLink = `/proposal/new/plans?${searchParams.toString()}`;
  
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
                signatureData={signatureData}
                onSaveSignature={handleSaveSignature}
                onClearSignature={() => setSignatureData(undefined)}
                paymentProofFile={paymentProofFile}
                setPaymentProofFile={setPaymentProofFile}
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
                            description="Client portal is set up within 12 hours of signing and making payment."
                        />
                        <TimelineItem 
                            icon={<CalendarCheck className="h-5 w-5" />}
                            title="Onboarding"
                            description="Initial delivery schedule set within 48 hours."
                        />
                        <TimelineItem 
                            icon={<Ship className="h-5 w-5" />}
                            title="First Delivery"
                            description="Equipment and first water batch arrive within 12 hours after activation."
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
