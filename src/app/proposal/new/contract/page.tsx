
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
import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
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
import { Download, Send, Rocket, Computer, CalendarClock, RotateCw, AreaChart, Thermometer, Wrench, CircleHelp, Phone, Users, Waves, Package, CheckCircle, CalendarCheck, Ship, Bot, Save, HeartPulse, Coffee, Building, Car, RefreshCcw, CreditCard, Loader2, FileCheck, FileText, Eye, Badge, Home, Share2, ClipboardCopy, FileText as FileTextIcon, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Logo } from '@/components/logo';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import Image from 'next/image';
import { allPlans, deliveryFrequencies, gallonRotationData } from '@/app/proposal/new/plans/page';
import { PaymentMethods } from '@/components/payment-methods';
import { ContractDetails, type FinalPlanDetails } from '@/components/contract-details';
import type { Client, UserProfile } from '@/lib/definitions';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, serverTimestamp, addDoc, doc, setDoc, runTransaction, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { addMonths, parseISO } from 'date-fns';

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


export function PreviewDialog({ 
    searchParams,
}: { 
    searchParams: URLSearchParams;
}) {
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
    
    const [sanitationFeeType, setSanitationFeeType] = useState('free');
    const [sanitationFee, setSanitationFee] = useState(500);

    const [dispenserFeeType, setDispenserFeeType] = useState('monthly');
    const [dispenserQuantity, setDispenserQuantity] = useState(0);
    const [dispenserFee, setDispenserFee] = useState(250);
    
    const [generatedClientId, setGeneratedClientId] = useState<string | undefined>(existingClientId);
    const [generatedProposalId, setGeneratedProposalId] = useState<string | undefined>();
    
    const [signatureData, setSignatureData] = useState<string | undefined>();
    const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
    const [isDialogOpen, setDialogOpen] = useState(true);

    const contractRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
    const [allSalesUsers, setAllSalesUsers] = useState<UserProfile[]>([]);

    useEffect(() => {
        if (!isDialogOpen) {
            const params = new URLSearchParams(searchParams.toString());
            router.push(`/proposal/new/plans?${params.toString()}`);
        }
    }, [isDialogOpen, router, searchParams]);

    useEffect(() => {
        if (firestore) {
            getDocs(collection(firestore, 'sales')).then(snapshot => {
                const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
                setAllSalesUsers(users);
            });
        }
    }, [firestore]);


    const ensureClientAndProposalIdsAreGenerated = useCallback(async () => {
        if (!firestore) throw new Error("Firestore not ready.");

        let finalClientId = generatedClientId;
        let finalProposalId = generatedProposalId;

        if (!finalClientId && !existingClientId) {
        try {
            const clientCounterRef = doc(firestore, 'counters', 'clientCounter');
            const newClientNumber = await runTransaction(firestore, async (transaction) => {
                const counterSnap = await transaction.get(clientCounterRef);
                const currentId = counterSnap.exists() ? counterSnap.data().currentId : 0;
                const newId = currentId + 1;
                transaction.set(clientCounterRef, { currentId: newId }, { merge: true });
                return newId;
            });
            const year = new Date().getFullYear().toString().slice(-2);
            finalClientId = `SC${year}${String(newClientNumber).padStart(8, '0')}`;
            setGeneratedClientId(finalClientId);
        } catch (e) {
            console.error("Error generating Client ID:", e);
            toast({ variant: 'destructive', title: "ID Generation Failed", description: "Could not generate a unique ID for the client." });
            throw e;
        }
        } else {
            finalClientId = finalClientId || existingClientId;
        }
        
        if (!finalProposalId) {
            try {
                const proposalCounterRef = doc(firestore, 'counters', 'proposalCounter');
                const newProposalNumber = await runTransaction(firestore, async (transaction) => {
                    const counterSnap = await transaction.get(proposalCounterRef);
                    const currentId = counterSnap.exists() ? counterSnap.data().currentId : 0;
                    const newId = currentId + 1;
                    transaction.set(proposalCounterRef, { currentId: newId }, { merge: true });
                    return newId;
                });
                finalProposalId = String(newProposalNumber).padStart(10, '0');
                setGeneratedProposalId(finalProposalId);
            } catch (e) {
                console.error("Error generating Proposal ID:", e);
                toast({ variant: 'destructive', title: "ID Generation Failed", description: "Could not generate a unique ID for the proposal." });
                throw e;
            }
        }
        return { clientId: finalClientId, proposalId: finalProposalId };
    }, [firestore, generatedClientId, generatedProposalId, existingClientId, toast]);
    
    useEffect(() => {
        ensureClientAndProposalIdsAreGenerated();
    }, [ensureClientAndProposalIdsAreGenerated]);

    
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

    const saveProposal = useCallback(async (status: 'draft' | 'accepted'): Promise<boolean> => {
        if (!finalPlanDetails || !firestore) {
            toast({ variant: "destructive", title: "Missing Information" });
            return false;
        }
        if (status === 'accepted' && !paymentProofFile) {
            toast({ variant: "destructive", title: "Payment Proof Required" });
            return false;
        }

        const proposalOwnerId = managerId || user?.uid;
        if (!proposalOwnerId) {
            toast({ variant: "destructive", title: "Authentication Error" });
            return false;
        }
    
        setIsSaving(true);
        const onboardingToken = crypto.randomUUID();
    
        try {
            const { clientId: finalClientId, proposalId: finalProposalId } = await ensureClientAndProposalIdsAreGenerated();
            
            await runTransaction(firestore, async (transaction) => {
                let downloadURL = '';
                if (paymentProofFile) {
                    const storage = getStorage();
                    const filePath = `payment_proofs/${finalClientId}/${finalProposalId}/${paymentProofFile.name}`;
                    const storageRef = ref(storage, filePath);
                    const snapshot = await uploadBytes(storageRef, paymentProofFile);
                    downloadURL = await getDownloadURL(snapshot.ref);
                }
                
                const clientRef = doc(firestore, 'clients', finalClientId);
                const clientData: any = { id: finalClientId, userId: proposalOwnerId, companyName, contactName, contactEmail, contactPhone, address, clientType: clientType || 'sme' };
                
                const clientDoc = await getDoc(clientRef);
                if (!clientDoc.exists()) {
                    clientData.createdAt = serverTimestamp();
                }

                if (status === 'accepted') {
                    clientData.onboardingToken = onboardingToken;
                    clientData.status = 'active';
                    clientData.paymentStatus = 'Paid';
                    clientData.subscription = { ...finalPlanDetails.plan, dateSigned: new Date().toISOString() };
                } else {
                    if (!clientDoc.exists()) clientData.status = 'pending';
                }
                transaction.set(clientRef, clientData, { merge: true });
                
                const proposalContentToSave: FinalPlanDetails = { ...finalPlanDetails, signature: signatureData, proposalId: finalProposalId, clientId: finalClientId };
                const amountToSave = finalPlanDetails.isCustomPlan ? 0 : parseFloat(String(proposalContentToSave.totalAmountDue).replace(/[^0-9.-]+/g, ""));
                
                const proposalRef = doc(firestore, 'proposals', finalProposalId);
                const nestedProposalRef = doc(firestore, `clients/${finalClientId}/proposals`, finalProposalId);
                const newProposalData: any = {
                    id: finalProposalId, clientId: finalClientId, userId: proposalOwnerId, title: proposalContentToSave.summaryTitle,
                    content: JSON.stringify(proposalContentToSave), status, amount: amountToSave, updatedAt: serverTimestamp()
                };

                if (campaignName) newProposalData.sourceLocation = campaignName;
                if(downloadURL) newProposalData.paymentProofUrl = downloadURL;
                
                const proposalDoc = await getDoc(proposalRef);
                if (!proposalDoc.exists()) newProposalData.createdAt = serverTimestamp();

                transaction.set(proposalRef, newProposalData, { merge: true });
                transaction.set(nestedProposalRef, newProposalData, { merge: true });

                if (status === 'accepted') {
                    const proposalCreator = allSalesUsers.find(u => u.id === proposalOwnerId);
                    const teamManager = (proposalCreator?.role === 'sales' && proposalCreator.team)
                        ? allSalesUsers.find(u => u.role === 'manager' && `${u.location} (${u.displayName})` === proposalCreator.team)
                        : null;
                    const isQrCampaign = !!campaignName;

                    const commissionRates: { [key: string]: number } = { household: 0.12, sme: 0.12, commercial: 0.10, corporate: 0.10, enterprise: 0.08 };
                    const recurringCommissionRates: { [key: string]: number } = { household: 0, sme: 0.03, commercial: 0.03, corporate: 0.03, enterprise: 0.03 };
                    const managerOverrideRates: { [key: string]: number } = { household: 0.02, sme: 0.03, commercial: 0.03, corporate: 0.03, enterprise: 0.02 };
                    
                    const rate = (finalPlanDetails.clientType && commissionRates[finalPlanDetails.clientType]) || 0;
                    const commissionAmount = amountToSave * rate;
                    
                    if (commissionAmount > 0) {
                        const commissionRecipientId = proposalOwnerId;
                        const execCommissionRef = doc(collection(firestore, 'commissions'));
                        transaction.set(execCommissionRef, {
                            userId: commissionRecipientId, proposalId: finalProposalId, amount: commissionAmount,
                            createdAt: serverTimestamp(), status: 'pending', type: 'commission',
                            description: `Commission for ${finalPlanDetails.summaryTitle}` + (isQrCampaign ? ' (QR Campaign)' : ''),
                            clientName: companyName, referenceId: finalProposalId
                        });
                    }

                    if (finalPlanDetails.clientType && recurringCommissionRates[finalPlanDetails.clientType] > 0) {
                        const isRecurringEligible = (proposalCreator?.role === 'sales' && !isQrCampaign) || (proposalCreator?.role === 'manager' && isQrCampaign);
                        if (isRecurringEligible) {
                            const recurringRate = recurringCommissionRates[finalPlanDetails.clientType];
                            const recurringAmount = amountToSave * recurringRate;
                            const startDate = new Date();
                            for (let i = 0; i < 12; i++) {
                                const commissionDate = addMonths(startDate, i);
                                const recurringCommissionRef = doc(collection(firestore, 'commissions'));
                                transaction.set(recurringCommissionRef, {
                                    userId: proposalOwnerId, proposalId: finalProposalId, amount: recurringAmount,
                                    createdAt: commissionDate, status: 'pending', type: 'commission',
                                    description: `Recurring (${i + 1}/12)` + (isQrCampaign ? ' (QR Campaign)' : ''),
                                    clientName: companyName, referenceId: `recurring-${finalProposalId}-${i}`
                                });
                            }
                        }
                    }

                    if (proposalCreator && proposalCreator.role === 'sales' && teamManager && !isQrCampaign) {
                        const overrideRate = (finalPlanDetails.clientType && managerOverrideRates[finalPlanDetails.clientType]) || 0;
                        const overrideAmount = amountToSave * overrideRate;
                        if (overrideAmount > 0) {
                            const managerCommissionRef = doc(collection(firestore, 'commissions'));
                            transaction.set(managerCommissionRef, {
                                userId: teamManager.id, proposalId: finalProposalId, amount: overrideAmount,
                                createdAt: serverTimestamp(), status: 'pending', type: 'commission',
                                description: `Manager Override for ${proposalCreator.displayName}'s sale`,
                                clientName: companyName, referenceId: `override-${finalProposalId}`
                            });
                        }
                    }
                }
            });
            if (status === 'accepted') {
                toast({ title: "Subscription Successful!", description: `Proposal for ${companyName} has been processed.` });
                router.push(`/onboarding/status?client_id=${finalPlanDetails.clientId}&proposal_id=${finalPlanDetails.proposalId}&token=${onboardingToken}`);
            } else {
                toast({ title: "Draft Saved!", description: "Your proposal draft has been saved." });
            }
            return true;
        } catch (error) {
            console.error("Error saving proposal:", error);
            toast({ variant: "destructive", title: "Save Failed", description: (error as Error).message });
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [finalPlanDetails, firestore, toast, paymentProofFile, managerId, user, existingClientId, campaignName, companyName, contactName, contactEmail, contactPhone, address, clientType, signatureData, ensureClientAndProposalIdsAreGenerated, router, allSalesUsers]);
  
    const handleSaveDraft = () => saveProposal('draft');
    
    const handleFinalize = async () => {
        if (!signatureData) {
            toast({ variant: "destructive", title: "Signature Required" });
            return;
        }
        if (!paymentProofFile) {
            toast({ variant: "destructive", title: "Payment Proof Required" });
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
    
    const handleSaveSignature = (data: string) => {
        setSignatureData(data);
        toast({ title: "Signature Saved" });
    };

    const handleGoBack = () => {
      setDialogOpen(false);
    };

    if (!finalPlanDetails) {
        return (
            <Dialog open={true}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Error</DialogTitle>
                        <DialogDescription>Could not load proposal details. Please go back and try again.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => router.back()}>Go Back</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }
    
    return (
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
             <DialogContent className="sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Proposal Preview & Finalization</DialogTitle>
                    <DialogDescription>Review the details, sign the agreement, and upload your payment to complete the process.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[75vh] pr-6 py-6">
                    <div ref={contractRef} className="space-y-6">
                        <ContractDetails
                            finalPlanDetails={finalPlanDetails}
                            isSigned={false}
                            signatureData={signatureData}
                            onSaveSignature={handleSaveSignature}
                            onClearSignature={() => setSignatureData(undefined)}
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
                    <Button type="button" variant="outline" onClick={handleGoBack}>Go Back</Button>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                        <Button type="button" onClick={handleSaveDraft} variant="outline" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                            I'd like to receive a call
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
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ContractPageContent() {
    const searchParams = useSearchParams();
  
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <PreviewDialog searchParams={searchParams} />
             {/* This content is effectively hidden because the dialog opens automatically */}
            <div className="hidden">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Finalize Proposal</h1>
                    <p className="text-muted-foreground">
                        Step 4: Review inclusions, add-ons, and sign the agreement.
                    </p>
                </div>
                </div>
            </div>
        </React.Suspense>
    );
}

export default function ContractPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <ContractPageContent />
        </React.Suspense>
    )
}

    
