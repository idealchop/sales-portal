

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
import { Phone, Mail, MapPin, Building, Briefcase, FileText, Users, GlassWater, RefreshCcw, Package, CheckCircle, Sparkles, Upload, FileCheck, Eye, CreditCard, MessageSquare, Save, Calendar, Clock, PlusCircle, Ship, Waves, HeartPulse, Coffee, Car, Computer, CalendarClock, RotateCw, Thermometer, Wrench, CircleHelp, Rocket, Bot } from 'lucide-react';
import type { Client, Remark, OnboardingStep, Proposal } from '@/lib/definitions';
import { ContractDetails } from '@/components/contract-details';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ActiveView } from '@/app/dashboard/proposals/page';
import { Textarea } from './ui/textarea';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHeader, TableRow } from './ui/table';
import { GoogleMap } from './google-map';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';


const clientStatusStyles: { [key: string]: string } = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
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

export function ClientOverviewDialog({
  children,
  client,
  proposal,
  view,
  setActiveView,
}: {
  children: React.ReactNode;
  client: Client;
  proposal?: Proposal;
  view: 'proposals' | 'clients';
  setActiveView?: (view: ActiveView) => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [isUploaded, setIsUploaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState(client.remarks || []);
  const [newRemark, setNewRemark] = useState('');
  const [clientProposals, setClientProposals] = useState<Proposal[]>([]);
  
  const selectedProposal = useMemo(() => {
    if (proposal) return proposal;
    if (clientProposals.length > 0) return clientProposals[0];
    return null;
  }, [proposal, clientProposals]);


  useEffect(() => {
    if (open && firestore && client.id) {
      const proposalsRef = collection(firestore, `clients/${client.id}/proposals`);
      const q = query(proposalsRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedProposals: Proposal[] = [];
        snapshot.forEach((doc) => {
          fetchedProposals.push({ id: doc.id, ...doc.data() } as Proposal);
        });
        fetchedProposals.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setClientProposals(fetchedProposals);
      });

      return () => unsubscribe();
    }
  }, [firestore, client.id, open]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };
  
  const planImage = getPlanImage(client.subscription?.planId);
  
  const handleUpload = () => {
    setIsUploaded(true);
    toast({
        title: "File 'Uploaded'",
        description: "Proof of payment is ready for confirmation.",
    })
  }

  const handleConfirmPayment = () => {
    if (setActiveView) {
        setActiveView('clients');
    }
    setOpen(false); // Close the dialog
    toast({
        title: "Payment Confirmed!",
        description: `${client.companyName} is now an active client.`,
    })
  }

  const handleAddRemark = async () => {
    if (newRemark.trim() === '' || !firestore || !user) return;

    const remarksRef = collection(firestore, 'clients', client.id, 'remarks');
    
    try {
        await addDoc(remarksRef, {
            content: newRemark,
            author: user.displayName || 'Sales Agent',
            timestamp: serverTimestamp(),
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
  
  const parsedProposalContent = useMemo(() => {
    if (!selectedProposal?.content) return null;
    try {
        return JSON.parse(selectedProposal.content);
    } catch (e) {
        console.error("Failed to parse proposal content:", e);
        return null;
    }
  }, [selectedProposal]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Client Overview</DialogTitle>
          <DialogDescription>
            A complete overview of {client.companyName}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[75vh] pr-6">
            <div className="space-y-6 py-4">
                 <Card>
                    <CardContent className="p-6 flex items-start gap-6">
                         <Avatar className="h-24 w-24 border">
                            <AvatarImage
                                src={`https://picsum.photos/seed/${client.id}/128/128`}
                                alt={client.contactName}
                            />
                            <AvatarFallback>{getInitials(client.contactName)}</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-2 flex-1">
                            <h2 className="text-2xl font-bold">{client.companyName}</h2>
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
                                <CardTitle>Contact Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex items-center gap-3">
                                    <Building className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="font-semibold">{client.companyName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="font-semibold">{client.contactEmail}</p>
                                    </div>
                                </div>
                                 <div className="flex items-center gap-3">
                                    <Phone className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="font-semibold">{client.contactPhone}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div className='flex-1'>
                                        <p className="font-semibold">{client.address}</p>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <div className="aspect-video w-full overflow-hidden rounded-lg mt-2 cursor-pointer border">
                                                    <GoogleMap address={client.address} />
                                                </div>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-3xl h-[80vh]">
                                                <DialogHeader>
                                                    <DialogTitle>Location: {client.companyName}</DialogTitle>
                                                    <DialogDescription>{client.address}</DialogDescription>
                                                </DialogHeader>
                                                <div className="w-full h-full rounded-lg overflow-hidden">
                                                   <GoogleMap address={client.address} zoom={17} />
                                                </div>
                                            </DialogContent>
                                        </Dialog>
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
                        {client.subscription ? (
                            <>
                            <CardContent className="space-y-4">
                                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                                    <Image src={planImage} alt={client.subscription.planName} fill className="object-cover" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold">{client.subscription.planName}</h3>
                                    <p className="text-2xl font-bold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(client.subscription.amount)} / month</p>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <GlassWater className="h-4 w-4 text-primary" />
                                        <div>
                                            <p className="text-muted-foreground">Total Liters</p>
                                            <p className="font-semibold">{client.subscription.liters.toLocaleString()}L</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-primary" />
                                        <div>
                                            <p className="text-muted-foreground">Refillable Gallons</p>
                                            <p className="font-semibold">{client.subscription.gallons}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-primary" />
                                        <div>
                                            <p className="text-muted-foreground">Employees</p>
                                            <p className="font-semibold">{client.subscription.employees}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <RefreshCcw className="h-4 w-4 text-primary" />
                                        <div>
                                            <p className="text-muted-foreground">Refill Frequency</p>
                                            <p className="font-semibold">{client.subscription.refillFrequency}</p>
                                        </div>
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <h4 className="font-semibold mb-2">Inclusions</h4>
                                    <div className="space-y-2">
                                        {client.subscription.inclusions?.map((item) => (
                                        <div key={item} className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span>{item}</span>
                                        </div>
                                        ))}
                                    </div>
                                </div>
                                {client.subscription.addons && client.subscription.addons.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-2">Add-ons</h4>
                                        <div className="space-y-2">
                                            {client.subscription.addons.map((item) => (
                                                <div key={item} className="flex items-center gap-2 text-sm">
                                                    <Sparkles className="h-4 w-4 text-yellow-500" />
                                                    <span>{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
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
                                                <Image src={planImage} alt={client.subscription.planName} fill className="object-cover" />
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
                                </div>
                            </CardContent>
                        )}
                    </Card>
                 </div>

                 {view === 'proposals' ? (
                     <Card>
                        <CardHeader>
                            <CardTitle>Payment Confirmation</CardTitle>
                            <CardDescription>
                                Upload the client’s payment confirmation to finalize the subscription.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            {isUploaded ? (
                                <div className='flex items-center gap-2 text-sm text-green-600'>
                                   <FileCheck className="h-5 w-5" />
                                   <span className="font-medium">payment_receipt.pdf</span>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Awaiting proof of payment from client.
                                </p>
                            )}
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleUpload} disabled={isUploaded}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload
                                </Button>
                                <Button onClick={handleConfirmPayment} disabled={!isUploaded}>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Confirm Payment
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                 ) : (
                    <Dialog>
                        <DialogTrigger asChild>
                             <Card className="cursor-pointer hover:bg-accent transition-colors">
                                <CardHeader className="flex-row items-center gap-4 space-y-0">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                                        <FileCheck className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Payment Confirmed</CardTitle>
                                        <CardDescription>Click to view the payment receipt.</CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Payment Confirmation: {client.companyName}</DialogTitle>
                                <DialogDescription>
                                    Official receipt for the subscription payment.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4 space-y-4">
                                <div className="aspect-square w-full relative rounded-md overflow-hidden border">
                                    <Image
                                        src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2Freceipt-placeholder.png?alt=media&token=e9e8f498-38f3-4e4c-b5f7-91a5823158f1"
                                        alt="Payment Receipt"
                                        fill
                                        className="object-contain p-4"
                                        data-ai-hint="receipt"
                                    />
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                 )}
                
                 {parsedProposalContent && (
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
                                    Between: River Tech Group, Inc. (“Provider”) and {client.companyName} (“Client”).
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[85vh] pr-6">
                                <ContractDetails 
                                    finalPlanDetails={parsedProposalContent}
                                    isSigned={selectedProposal?.status === 'finalized' || selectedProposal?.status === 'accepted'}
                                />
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

