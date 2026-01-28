

'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from './ui/button';
import { Phone, Mail, MapPin, Building, Briefcase, FileText, Users, GlassWater, RefreshCcw, Package, CheckCircle, Sparkles, Upload, FileCheck, Eye, CreditCard, MessageSquare, Save, Calendar, Clock, PlusCircle, Ship, Waves, HeartPulse, Coffee, Car, Computer, CalendarClock, RotateCw, Thermometer, Wrench, CircleHelp, Rocket, Bot, Loader2, Receipt, User, Download } from 'lucide-react';
import type { Client, Remark, OnboardingStep, Proposal, UserProfile } from '@/lib/definitions';
import { ContractDetails, type FinalPlanDetails } from '@/components/contract-details';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ActiveView } from '@/app/dashboard/proposals/page';
import { Textarea } from './ui/textarea';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHeader, TableRow } from './ui/table';
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where, getDocs, doc, updateDoc, arrayUnion, writeBatch, runTransaction } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { addMonths, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


const clientStatusStyles: { [key: string]: string } = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  unpaid: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
};

const planImages: { [key: string]: string } = {
  sme: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_SME.png?alt=media&token=e6beeb7b-3ed1-4e51-87cf-1b65b49041a1",
  commercial: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_Business.png?alt=media&token=b8536b3c-5199-460a-8612-003c99139d7c",
  corporate: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_Enterprise.png?alt=media&token=29e0d6a7-41f7-4511-a8b6-0369989421bd",
  enterprise: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Fwater_refill_Flow.png?alt=media&token=6b11f719-39e9-4ea4-b4a6-1bbe587bfa63",
  household: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FSmartRefill_Individual.png?alt=media&token=090d07c4-848a-4cd6-aab6-f7a5909ea839",
};

const getPlanImage = (planId?: string) => {
    if (!planId) return planImages.sme;
    if (planId.includes('household')) return planImages.household;
    if (planId.includes('micro') || planId.includes('starter') || planId.includes('professional')) return planImages.sme;
    if (planId.includes('growth') || planId.includes('pro') || planId.includes('business')) return planImages.commercial;
    if (planId.includes('enterprise')) return planImages.corporate;
    return planImages.sme;
}

const OnboardingStepItem = ({ step, isLast }: { step: OnboardingStep; isLast: boolean }) => (
  <div className="flex gap-x-4">
    <div className={cn(
        "relative last:after:hidden after:absolute after:top-11 after:bottom-0 after:w-px after:bg-border after:left-1/2 after:-translate-x-1/2",
        !isLast && "min-h-[7rem]"
    )}>
        <div className="relative z-10 flex h-10 w-10 items-center justify-center">
            <div
                className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full ring-4 ring-background",
                step.status === 'completed' ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-700"
                )}
            >
                {step.status === 'completed' ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                )}
            </div>
        </div>
    </div>

    <div className="grow pt-1.5 pb-8">
      <h3 className="font-semibold text-foreground">{step.title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
      {step.providerName && (
        <Card className="mt-3 bg-muted/50">
            <CardHeader className="p-3">
                <CardTitle className="text-sm">Paired Water Provider</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 text-sm">
                 <div className="flex items-center gap-3">
                    <Ship className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="font-semibold">{step.providerName}</p>
                        <p className="text-xs text-muted-foreground">{step.providerLocation}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
      )}
      {step.date && (
        <p className="mt-2 text-xs text-muted-foreground">
          Completed on: {step.date}
        </p>
      )}
    </div>
  </div>
);

function PaymentHistory({ client, proposals, onPaymentConfirm }: { client: Client; proposals: Proposal[]; onPaymentConfirm: (proposalId: string, file: File) => Promise<void>; }) {
    const acceptedProposals = proposals.filter(p => p.status === 'accepted');
    const pendingProposals = proposals.filter(p => p.status === 'finalized');
    const [selectedPendingProposalId, setSelectedPendingProposalId] = useState<string>('');
    const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPaymentProofFile(file);
        }
    };

    const handleConfirmClick = async () => {
        if (!selectedPendingProposalId || !paymentProofFile) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please select a proposal and upload a payment proof file.',
            });
            return;
        }
        setIsConfirming(true);
        await onPaymentConfirm(selectedPendingProposalId, paymentProofFile);
        setIsConfirming(false);
        setPaymentProofFile(null);
        setSelectedPendingProposalId('');
    };
    
    const getFormattedDate = (dateValue: string | { toDate: () => Date; }) => {
        if (!dateValue) return "Invalid Date";
        try {
            if (typeof (dateValue as any).toDate === 'function') {
                return (dateValue as any).toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            }
            if (typeof dateValue === 'string') {
              const date = new Date(dateValue);
              if (isNaN(date.getTime())) return "Invalid Date";
              return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            }
        } catch (e) {
          return "Invalid Date";
        }
        return "Invalid Date";
    };

    const allPayments = useMemo(() => {
        const proposalPayments = acceptedProposals.map(p => ({
            date: p.createdAt,
            amount: p.amount,
            proofUrl: p.paymentProofUrl,
            source: 'Proposal',
            id: p.id
        }));

        const historyPayments = (client.paymentHistory || []).map(p => ({
            date: p.date,
            amount: p.amount,
            proofUrl: p.proofUrl,
            source: 'History',
            id: p.date + p.amount
        }));

        const combined = [...proposalPayments, ...historyPayments];
        combined.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return combined;

    }, [client.paymentHistory, acceptedProposals]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Review past payments and confirm new ones for this client.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <h4 className="font-semibold text-sm">Confirmed Payments</h4>
                {allPayments.length > 0 ? (
                    <div className="space-y-2">
                        {allPayments.map(p => (
                            <Dialog key={p.id}>
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div>
                                        <p className="font-medium text-sm">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(p.amount)}</p>
                                        <p className="text-xs text-muted-foreground">{getFormattedDate(p.date)}</p>
                                    </div>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" disabled={!p.proofUrl}>
                                            <Receipt className="mr-2 h-4 w-4" /> View Receipt
                                        </Button>
                                    </DialogTrigger>
                                </div>
                                {p.proofUrl && (
                                     <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Payment Receipt</DialogTitle>
                                        </DialogHeader>
                                        <div className="relative aspect-square w-full mt-4">
                                            <Image src={p.proofUrl} alt="Payment proof" fill className="object-contain"/>
                                        </div>
                                    </DialogContent>
                                )}
                            </Dialog>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No confirmed payments yet.</p>
                )}
                
                <Separator />

                <h4 className="font-semibold text-sm">Record New Payment</h4>
                {pendingProposals.length > 0 ? (
                    <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
                        <Select value={selectedPendingProposalId} onValueChange={setSelectedPendingProposalId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a finalized proposal..." />
                            </SelectTrigger>
                            <SelectContent>
                                {pendingProposals.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.title} - {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(p.amount)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         <Input
                            id="payment-proof-upload"
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/png, image/jpeg, image/gif, application/pdf"
                        />
                         <Button onClick={handleConfirmClick} disabled={!selectedPendingProposalId || !paymentProofFile || isConfirming} className="w-full">
                            {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Confirm This Payment
                        </Button>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No finalized proposals available to confirm.</p>
                )}
            </CardContent>
        </Card>
    )
}

export function ClientOverviewDialog({
  children,
  client,
  proposal,
  allUsers,
  view,
  setActiveView,
  isAdmin,
}: {
  children: React.ReactNode;
  client: Client;
  proposal?: Proposal;
  allUsers: UserProfile[];
  view: 'proposals' | 'clients';
  setActiveView?: (view: ActiveView) => void;
  isAdmin?: boolean;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isManager } = useUser();
  const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
  
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [newRemark, setNewRemark] = useState('');
  const [clientProposals, setClientProposals] = useState<Proposal[]>([]);

  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contractRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null | undefined>(null);
  
  const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

  const contactInfo = useMemo(() => {
    let parsedContent;
    try {
      parsedContent = selectedProposal?.content ? JSON.parse(selectedProposal.content) : null;
    } catch {
      parsedContent = null;
    }

    return {
      name: parsedContent?.contactName || client.contactName,
      company: parsedContent?.companyName || client.companyName,
      email: parsedContent?.contactEmail || client.contactEmail,
      phone: parsedContent?.contactPhone || client.contactPhone,
      address: parsedContent?.address || client.address,
    };
  }, [client, selectedProposal]);


 const subscriptionInfo = useMemo(() => {
    let activeProposal = selectedProposal;
    if (client.status === 'active' && !activeProposal) {
        activeProposal = clientProposals.find(p => p.status === 'accepted');
    }

    let content;
    try {
        content = activeProposal?.content ? JSON.parse(activeProposal.content) : null;
    } catch {
        content = null;
    }
    
    if (content) {
      const addons: { name: string, cost: number }[] = [];
      
      if (content.selectedAddons) {
        for (const addonKey in content.selectedAddons) {
          if (content.selectedAddons[addonKey]) {
            const addonDef = content.addons.find((a:any) => a.id === addonKey);
            if(addonDef) {
               addons.push({name: addonDef.name, cost: addonDef.feeValue });
            }
          }
        }
      }

      if (content.additionalDispensers > 0) {
        addons.push({
            name: `Additional Dispensers (${content.additionalDispensers})`,
            cost: content.additionalDispensers * content.additionalDispenserCost
        });
      }
      
      if (content.additionalLiters > 0) {
        addons.push({
            name: `Additional Liters (${content.additionalLiters} L)`,
            cost: content.additionalLiters * content.additionalLiterCost
        });
      }

      return {
        planId: content.plan.id,
        planName: content.summaryTitle,
        liters: content.totalMonthlyLiters,
        basePrice: content.planBaseCost,
        totalAmountDue: parseFloat(String(content.totalAmountDue).replace(/[^0-9.-]+/g, "")),
        billingCycle: content.billingCycleLabel,
        refillFrequency: content.refillFrequency,
        employees: content.employees,
        gallons: parseInt(content.refillableGallons) || 0,
        inclusions: content.plan.inclusions,
        addons,
        dateSigned: content.date,
        monthlyAmount: content.basePrice,
        clientType: content.clientType,
        signature: content.signature,
        rawContent: content,
      };
    }
    if (client.subscription) {
      const mappedAddons = Array.isArray(client.subscription.addons)
        ? client.subscription.addons.map(addon => (typeof addon === 'string' ? { name: addon, cost: 0 } : addon))
        : [];
      return {
        ...client.subscription,
        basePrice: client.subscription.amount,
        totalAmountDue: client.subscription.amount,
        billingCycle: 'Monthly',
        addons: mappedAddons,
        monthlyAmount: client.subscription.amount,
        clientType: client.clientType,
        rawContent: client.subscription,
      };
    }
    return null;
  }, [selectedProposal, client.subscription, client.clientType, client.status, clientProposals]);

  useEffect(() => {
    if (open && firestore && client.id) {
      const proposalsRef = collection(firestore, `clients/${client.id}/proposals`);
      const qProposals = query(proposalsRef);

      const unsubscribeProposals = onSnapshot(qProposals, (snapshot) => {
        const fetchedProposals: Proposal[] = [];
        snapshot.forEach((doc) => {
          fetchedProposals.push({ id: doc.id, ...doc.data() } as Proposal);
        });
        fetchedProposals.sort((a,b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        setClientProposals(fetchedProposals);
        
        if (view === 'clients') {
            const acceptedProposal = fetchedProposals.find(p => p.status === 'accepted');
            setSelectedProposal(acceptedProposal || fetchedProposals[0]);
        } else if (proposal) {
          const fullProposal = fetchedProposals.find(p => p.id === proposal.id);
          setSelectedProposal(fullProposal || proposal);
        } else if (fetchedProposals.length > 0 && !selectedProposal) {
          setSelectedProposal(fetchedProposals[0]);
        }
      });
      
      const remarksRef = collection(firestore, `clients/${client.id}/remarks`);
      const qRemarks = query(remarksRef);
      const unsubscribeRemarks = onSnapshot(qRemarks, (snapshot) => {
          const fetchedRemarks: Remark[] = [];
          snapshot.forEach((doc) => {
              const data = doc.data();
              fetchedRemarks.push({
                  content: data.content,
                  author: data.author,
                  timestamp: data.timestamp?.toDate().toLocaleString() || new Date().toLocaleString(),
              } as Remark);
          });
          fetchedRemarks.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setRemarks(fetchedRemarks);
      });

      return () => {
        unsubscribeProposals();
        unsubscribeRemarks();
      }
    }
  }, [firestore, client.id, open, proposal, view]);

  const getInitials = (name: string) => {
    if (!name) return "";
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };
  
  const planImage = getPlanImage(subscriptionInfo?.planId);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setPaymentProofPreview(URL.createObjectURL(file));
      } else {
        setPaymentProofPreview(null);
      }
      setPaymentProofFile(file);
      toast({
        title: "File Selected",
        description: `${file.name} is ready to be confirmed.`,
      });
    }
  };

  const handleConfirmPayment = async (proposalIdToConfirm?: string, fileToUpload?: File) => {
    const finalProposalId = proposalIdToConfirm || selectedProposal?.id;
    const finalFile = fileToUpload || paymentProofFile;

    if (!finalFile || !finalProposalId || !firestore || !subscriptionInfo || !selectedProposal) {
      toast({ variant: 'destructive', title: 'Error', description: 'Missing payment proof, proposal details, or subscription info.' });
      return;
    }

    const proposalCreatorId = selectedProposal.userId;
    if (!proposalCreatorId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not identify the sales representative for this proposal.' });
      return;
    }

    const proposalCreator = userMap.get(proposalCreatorId);
    const teamManager = (proposalCreator?.role === 'sales' && proposalCreator.team)
      ? allUsers.find(u => u.role === 'manager' && `${u.location} (${u.displayName})` === proposalCreator.team)
      : null;

    const isQrCampaign = !!selectedProposal.sourceLocation;

    setIsConfirmingPayment(true);
    try {
      await runTransaction(firestore, async (transaction) => {
        const storage = getStorage();
        const filePath = `payment_proofs/${client.id}/${finalProposalId}/${finalFile.name}`;
        const storageRef = ref(storage, filePath);
        const snapshot = await uploadBytes(storageRef, finalFile);
        const downloadURL = await getDownloadURL(snapshot.ref);

        const proposalRef = doc(firestore, `clients/${client.id}/proposals`, finalProposalId);
        transaction.update(proposalRef, { status: 'accepted', paymentProofUrl: downloadURL });

        const clientRef = doc(firestore, 'clients', client.id);
        transaction.update(clientRef, {
          status: 'active',
          paymentStatus: 'Paid',
          subscription: { ...subscriptionInfo.rawContent, dateSigned: new Date().toISOString() }
        });

        const commissionRates: { [key: string]: number } = { household: 0.12, sme: 0.12, commercial: 0.10, corporate: 0.10, enterprise: 0.08 };
        const recurringCommissionRates: { [key: string]: number } = { household: 0, sme: 0.03, commercial: 0.03, corporate: 0.03, enterprise: 0.03 };
        const managerOverrideRates: { [key: string]: number } = { household: 0.02, sme: 0.03, commercial: 0.03, corporate: 0.03, enterprise: 0.02 };

        const rate = (subscriptionInfo.clientType && commissionRates[subscriptionInfo.clientType]) || 0;
        const commissionAmount = subscriptionInfo.totalAmountDue * rate;
        
        // One-time commission for direct sales (sales or manager) or QR campaigns (manager)
        if (commissionAmount > 0) {
          const commissionRecipientId = proposalCreatorId;
          const execCommissionRef = doc(collection(firestore, 'commissions'));
          transaction.set(execCommissionRef, {
            userId: commissionRecipientId,
            proposalId: finalProposalId,
            amount: commissionAmount,
            createdAt: serverTimestamp(),
            status: 'pending',
            type: 'commission',
            description: `Commission for ${subscriptionInfo.planName}` + (isQrCampaign ? ' (QR Campaign)' : ''),
            clientName: client.companyName,
            referenceId: finalProposalId
          });
        }
        
        // Recurring commission for direct sales by sales execs OR QR campaigns by managers
        if (subscriptionInfo.clientType && recurringCommissionRates[subscriptionInfo.clientType] > 0) {
            if ((proposalCreator?.role === 'sales' && !isQrCampaign) || (proposalCreator?.role === 'manager' && isQrCampaign)) {
                const recurringRate = recurringCommissionRates[subscriptionInfo.clientType];
                const recurringAmount = subscriptionInfo.totalAmountDue * recurringRate;
                const startDate = parseISO(selectedProposal.createdAt);
                for (let i = 0; i < 12; i++) {
                    const commissionDate = addMonths(startDate, i);
                    const recurringCommissionRef = doc(collection(firestore, 'commissions'));
                    transaction.set(recurringCommissionRef, {
                        userId: proposalCreatorId,
                        proposalId: finalProposalId,
                        amount: recurringAmount,
                        createdAt: commissionDate,
                        status: 'pending',
                        type: 'commission',
                        description: `Recurring (${i + 1}/12)` + (isQrCampaign ? ' (QR Campaign)' : ''),
                        clientName: client.companyName,
                        referenceId: `recurring-${finalProposalId}-${i}`
                    });
                }
            }
        }
        
        // Team Override commission for sales exec's direct sale
        if (proposalCreator && proposalCreator.role === 'sales' && teamManager && !isQrCampaign) {
            const overrideRate = (subscriptionInfo.clientType && managerOverrideRates[subscriptionInfo.clientType]) || 0;
            const overrideAmount = subscriptionInfo.totalAmountDue * overrideRate;
            if (overrideAmount > 0) {
              const managerCommissionRef = doc(collection(firestore, 'commissions'));
              transaction.set(managerCommissionRef, {
                userId: teamManager.id,
                proposalId: finalProposalId,
                amount: overrideAmount,
                createdAt: serverTimestamp(),
                status: 'pending',
                type: 'commission',
                description: `Manager Override for ${proposalCreator.displayName}'s sale`,
                clientName: client.companyName,
                referenceId: `override-${finalProposalId}`
              });
            }
        }
      });

      toast({
        title: "Payment Confirmed & Client Activated!",
        description: `${client.companyName}'s account is now active and has been passed to the onboarding team.`,
      });

      if (view === 'proposals') {
        setOpen(false);
        if (setActiveView) {
          setActiveView('clients');
        }
      }
    } catch (error) {
      console.error("Payment confirmation failed:", error);
      toast({ variant: 'destructive', title: 'Transaction Failed', description: 'Could not confirm payment. Please try again.' });
    } finally {
      setIsConfirmingPayment(false);
    }
  }

  const handleAddRemark = async () => {
    if (newRemark.trim() === '' || !firestore || !user) return;

    const remarksRef = collection(firestore, 'clients', client.id, 'remarks');
    
    try {
        await addDoc(remarksRef, {
            content: newRemark,
            author: user.displayName || 'Sales Agent',
            timestamp: serverTimestamp(),
            userId: user.uid,
        });
        setNewRemark('');
        toast({
            title: "Remark Added",
            description: "Your new remark has been added to the log.",
        });
    } catch (error) {
        console.error("Error adding remark:", error);
        toast({
            variant: 'destructive',
            title: "Error",
            description: "Could not add remark.",
        });
    }
  }
  
  const clientTypeMap = {
    household: 'Family Plan',
    sme: 'SME',
    commercial: 'Commercial',
    corporate: 'Corporate',
    enterprise: 'Enterprise'
  };

  const getFormattedDate = (dateValue: string | { toDate: () => Date; }) => {
    if (!dateValue) return "Invalid Date";
    try {
      if (typeof (dateValue as any).toDate === 'function') {
          return (dateValue as any).toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      }
      if (typeof dateValue === 'string') {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return "Invalid Date";
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      }
    } catch (e) {
      return "Invalid Date";
    }
    return "Invalid Date";
  };
  
  const finalPlanDetails: FinalPlanDetails | null = useMemo(() => {
    if (!subscriptionInfo) return null;
    return {
      ...subscriptionInfo.rawContent,
      totalAmountDue: currencyFormatter.format(subscriptionInfo.totalAmountDue),
      date: subscriptionInfo.dateSigned ? getFormattedDate(subscriptionInfo.dateSigned) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      companyName: contactInfo.company,
      contactName: contactInfo.name,
      contactEmail: contactInfo.email,
      contactPhone: contactInfo.phone,
      address: contactInfo.address,
      clientId: client.id,
      proposalId: selectedProposal?.id,
      signature: subscriptionInfo.signature,
    };
  }, [subscriptionInfo, contactInfo, client.id, selectedProposal?.id, currencyFormatter]);

  const handleDownloadPDF = async () => {
    if (!contractRef.current || !finalPlanDetails) return;

    setIsDownloading(true);
    try {
        const canvas = await html2canvas(contractRef.current, {
            scale: 2,
            useCORS: true,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height],
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`proposal-${finalPlanDetails.proposalId || 'download'}.pdf`);
        
        toast({
            title: "Download Complete",
            description: "The proposal has been downloaded as a PDF.",
        });
    } catch (error) {
        console.error("Error generating PDF: ", error);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: "There was a problem generating the PDF. Please try again.",
        });
    } finally {
        setIsDownloading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Client Overview</DialogTitle>
          <DialogDescription>
            A complete overview of {contactInfo.company}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[75vh] pr-6">
            <div className="space-y-6 py-4">
                 <Card>
                    <CardContent className="p-6 flex items-start gap-6">
                         <Avatar className="h-24 w-24 border">
                           <AvatarFallback className="text-3xl bg-primary text-primary-foreground">{getInitials(contactInfo.company)}</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-2 flex-1">
                            <h2 className="text-2xl font-bold">{contactInfo.company}</h2>
                            <p className="text-muted-foreground font-mono text-sm">Client ID: {client.id}</p>
                             <Badge className={`capitalize w-fit ${clientStatusStyles[client.status]}`} variant="outline">
                                {client.status}
                            </Badge>
                             <div className="flex items-center gap-4 pt-2">
                                <Button variant="outline" size="sm"><Mail className="mr-2 h-4 w-4" /> Email</Button>
                                <Button variant="outline" size="sm"><Phone className="mr-2 h-4 w-4" /> Call</Button>
                            </div>
                        </div>
                    </CardContent>
                 </Card>

                 <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Client Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex items-start gap-3">
                                    <User className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Contact Person</p>
                                        <p className="font-semibold">{contactInfo.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Mail className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Email</p>
                                        <p className="font-semibold">{contactInfo.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Phone className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Phone</p>
                                        <p className="font-semibold">{contactInfo.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div className='flex-1'>
                                        <p className="text-xs text-muted-foreground">Address</p>
                                        <p className="font-semibold">{contactInfo.address}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Sales Remarks</CardTitle>
                                <CardDescription>Internal notes for the sales team.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Textarea
                                        placeholder="Add a new remark..."
                                        value={newRemark}
                                        onChange={(e) => setNewRemark(e.target.value)}
                                        className="min-h-[80px]"
                                    />
                                    <Button onClick={handleAddRemark} size="sm" className="w-full">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Remark
                                    </Button>
                                </div>
                                <Separator />
                                <div className="space-y-4 max-h-48 overflow-y-auto">
                                    {remarks.length > 0 ? (
                                        remarks.map((remark, index) => (
                                            <div key={index} className="text-sm p-3 bg-muted/50 rounded-lg">
                                                <p className="text-foreground">{remark.content}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    - {remark.author} on {remark.timestamp}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">No remarks yet.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Current Subscription</CardTitle>
                        </CardHeader>
                        {subscriptionInfo ? (
                            <>
                            <CardContent className="space-y-4">
                                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                                    <Image src={planImage} alt={subscriptionInfo.planName || 'Plan image'} fill className="object-cover" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-lg">{subscriptionInfo.clientType ? `${clientTypeMap[subscriptionInfo.clientType] || subscriptionInfo.clientType} - ` : ''}{subscriptionInfo.planName}</h4>
                                    <p className="text-2xl font-bold">{currencyFormatter.format(subscriptionInfo.monthlyAmount || 0)} <span className="text-sm font-normal text-muted-foreground"> / mo</span></p>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Plan Details</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <GlassWater className="h-4 w-4 text-primary" />
                                            <div>
                                                <p className="text-muted-foreground">Total Liters</p>
                                                <p className="font-semibold">{(subscriptionInfo.liters || 0).toLocaleString()}L / mo</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-primary" />
                                            <div>
                                                <p className="text-muted-foreground">Refillable Gallons</p>
                                                <p className="font-semibold">{subscriptionInfo.gallons}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-primary" />
                                            <div>
                                                <p className="text-muted-foreground">Employees</p>
                                                <p className="font-semibold">{subscriptionInfo.employees}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <RefreshCcw className="h-4 w-4 text-primary" />
                                            <div>
                                                <p className="text-muted-foreground">Refill Frequency</p>
                                                <p className="font-semibold">{subscriptionInfo.refillFrequency}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <Separator />

                                <div className="space-y-3">
                                    <h4 className="font-semibold text-sm">Financial Summary</h4>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Base Plan (Monthly)</span>
                                        <span className="font-medium">{currencyFormatter.format(subscriptionInfo.basePrice)}</span>
                                    </div>
                                    {subscriptionInfo.addons && Array.isArray(subscriptionInfo.addons) && subscriptionInfo.addons.map((addon, index) => (
                                        <div key={index} className="flex justify-between text-sm">
                                            <span className="text-muted-foreground flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-yellow-500" />
                                                {typeof addon === 'string' ? addon : addon.name}
                                            </span>
                                            {typeof addon !== 'string' && addon.cost > 0 && <span className="font-medium">{currencyFormatter.format(addon.cost)}</span>}
                                        </div>
                                    ))}
                                    <Separator />
                                     <div className="flex justify-between items-center font-bold text-base bg-muted p-3 rounded-md">
                                        <span>Total ({subscriptionInfo.billingCycle})</span>
                                        <span>{currencyFormatter.format(subscriptionInfo.totalAmountDue)}</span>
                                    </div>
                                </div>
                            </CardContent>
                             {view === 'clients' && client.onboardingStatus && (
                                <CardFooter>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full">
                                                View Onboarding Progress
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>Onboarding Progress: {client.companyName}</DialogTitle>
                                                <DialogDescription>Tracking the client's journey to full activation.</DialogDescription>
                                            </DialogHeader>
                                            <div className="grid md:grid-cols-2 gap-6 py-4">
                                                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                                                    {subscriptionInfo && <Image src={planImage} alt={subscriptionInfo.planName || 'Plan image'} fill className="object-cover" />}
                                                </div>
                                                <div>
                                                    <div className="flex flex-col">
                                                        {client.onboardingStatus.map((step, index) => (
                                                            <OnboardingStepItem 
                                                                key={index} 
                                                                step={step} 
                                                                isLast={index === client.onboardingStatus!.length - 1} 
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </CardFooter>
                            )}
                            </>
                        ) : (
                            <CardContent>
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No active subscription.</p>
                                    <Button asChild size="sm" className="mt-4">
                                        <Link href={`/dashboard/proposals/new?clientId=${client.id}&companyName=${client.companyName}&contactName=${client.contactName}&contactEmail=${client.contactEmail}&contactPhone=${client.contactPhone}&address=${client.address}&clientType=${client.clientType}`}>
                                            Create New Proposal
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                 </div>
                  
                {view === 'proposals' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Proposal History</CardTitle>
                         <CardDescription>
                            Review all proposals sent to this client. Click one to view details.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {clientProposals.length > 0 ? (
                            <div className="grid gap-2">
                                {clientProposals.map(p => {
                                    const owner = userMap.get(p.userId);
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelectedProposal(p)}
                                            className={cn(
                                                "flex items-center justify-between rounded-lg border p-3 text-left transition-colors w-full",
                                                selectedProposal?.id === p.id 
                                                    ? "bg-primary text-primary-foreground border-primary" 
                                                    : "hover:bg-accent"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={owner?.photoURL || undefined} />
                                                    <AvatarFallback className="text-xs">{owner?.displayName?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className={cn("font-semibold text-sm", selectedProposal?.id === p.id && "text-primary-foreground")}>{p.title}</p>
                                                    <p className={cn("text-xs", selectedProposal?.id === p.id ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                                        {getFormattedDate(p.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={cn("text-xs font-mono rounded px-2 py-1", selectedProposal?.id === p.id ? "bg-primary-foreground/20 text-primary-foreground font-bold" : "bg-muted")}>
                                                {p.id}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No proposals found for this client.</p>
                        )}
                    </CardContent>
                </Card>
                )}

                 {(view === 'proposals' || (view === 'clients' && client.status === 'pending' && selectedProposal?.status === 'finalized')) && selectedProposal?.status !== 'accepted' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Confirmation</CardTitle>
                            <CardDescription>
                                Upload the client’s payment confirmation to finalize the subscription.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {paymentProofFile && (
                                <div className="space-y-2">
                                    <Label>Payment Proof Upload</Label>
                                    <div className="flex items-center gap-2 rounded-md border p-2 bg-muted/50">
                                        {paymentProofPreview ? (
                                            <div className="relative h-12 w-12 flex-shrink-0">
                                                <Image src={paymentProofPreview} alt="Preview" fill className="object-cover rounded-sm" />
                                            </div>
                                        ) : (
                                            <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                                        )}
                                        <div className="flex-grow">
                                            <p className="text-sm font-medium truncate">{paymentProofFile.name}</p>
                                            <p className="text-xs text-muted-foreground">{(paymentProofFile.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isConfirmingPayment}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {paymentProofFile ? 'Change File' : 'Upload File'}
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/gif, application/pdf"
                                />

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button disabled={!paymentProofFile || isConfirmingPayment}>
                                            <CreditCard className="mr-2 h-4 w-4" />
                                            Confirm Payment
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action will mark the proposal as accepted and set the client's status to <span className="font-bold text-green-600">active</span>. This cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleConfirmPayment()} disabled={isConfirmingPayment}>
                                                 {isConfirmingPayment ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Confirming...
                                                    </>
                                                ) : (
                                                    "Yes, Confirm Payment"
                                                )}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardContent>
                    </Card>
                 )}
                
                 {view === 'clients' && client.status === 'active' && (
                     <PaymentHistory client={client} proposals={clientProposals} onPaymentConfirm={handleConfirmPayment} />
                 )}

                 {finalPlanDetails && (selectedProposal?.status === 'finalized' || selectedProposal?.status === 'accepted') && (
                    <Dialog>
                        <DialogTrigger asChild>
                             <Card className="cursor-pointer hover:bg-accent transition-colors">
                                <CardHeader className="flex-row items-center gap-4 space-y-0">
                                    <FileText className="h-6 w-6 text-primary" />
                                    <div>
                                        <CardTitle className="text-base">View Signed Contract</CardTitle>
                                        <CardDescription>Click to view the full agreement for proposal: {selectedProposal?.id}</CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-5xl">
                            <DialogHeader className="sr-only">
                                <DialogTitle>Smart Refill™ Water Supply Subscription Agreement</DialogTitle>
                                <DialogDescription>
                                    Between: River Tech Group, Inc. (“Provider”) and {client.companyName}.
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[75vh] pr-6">
                                <div ref={contractRef}>
                                    <ContractDetails 
                                        finalPlanDetails={finalPlanDetails}
                                        isSigned={selectedProposal?.status === 'finalized' || selectedProposal?.status === 'accepted'}
                                        signatureData={finalPlanDetails.signature}
                                    />
                                </div>
                            </ScrollArea>
                            <DialogFooter>
                                <Button onClick={handleDownloadPDF} disabled={isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                    Download as PDF
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
