

'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileText, Users, CircleDollarSign, Percent, CreditCard, UsersRound, Trophy, Award, Activity, Star, BarChart3, CheckCircle, MoreHorizontal, Clock, Ship, Bot, Upload, Search, Filter, CalendarDays } from 'lucide-react';
import { useAllProposals } from '@/hooks/use-all-proposals';
import { useAllClients } from '@/hooks/use-all-clients';
import { useSalesUsers } from '@/hooks/use-sales-users';
import { useAllCommissions } from '@/hooks/use-all-commissions';
import { useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ClientOverviewDialog } from '@/components/client-overview-dialog';
import type { UserProfile, Client, Proposal, Commission, OnboardingStep } from '@/lib/definitions';
import { WithId } from '@/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, getYear, getMonth, parse } from 'date-fns';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const clientStatusStyles: { [key: string]: string } = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
};

const paymentStatusStyles: { [key: string]: string } = {
    Paid: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    Unpaid: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const commissionStatusStyles: { [key: string]: string } = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
};

const planImages: { [key: string]: string } = {
  sme: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_SME.png?alt=media&token=e6beeb7b-3ed1-4e51-87cf-1b65b49041a1",
  commercial: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_Business.png?alt=media&token=b8536b3c-5199-460a-8612-003c99139d7c",
  corporate: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_Enterprise.png?alt=media&token=29e0d6a7-41f7-4511-a8b6-0369989421bd",
  enterprise: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Fwater_refill_Flow.png?alt=media&token=6b11f719-39e9-4ea4-b4a6-1bbe587bfa63",
  household: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FSmartRefill_Individual.png?alt=media&token=090d07c4-848a-4cd6-aab6-f7a5909ea839",
};


const AdminDashboardSkeleton = () => (
  <div className="space-y-8">
    <div>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 mt-2" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-3 w-32 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
         <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

const OnboardingStepItem = ({ step, isLast, onClick, isAdmin, isCompleted }: { step: OnboardingStep, isLast: boolean, onClick: () => void, isAdmin: boolean, isCompleted: boolean }) => (
  <div className="flex gap-x-4">
    <div className={cn(
        "relative last:after:hidden after:absolute after:top-11 after:bottom-0 after:w-px after:bg-border after:left-1/2 after:-translate-x-1/2",
        !isLast && "min-h-[7rem]"
    )}>
      <div 
        className={cn(
          "relative z-10 flex h-10 w-10 items-center justify-center rounded-full ring-4 ring-background",
          isCompleted ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-700",
          isAdmin && !isCompleted && "cursor-pointer hover:bg-primary/20"
        )}
        onClick={isAdmin && !isCompleted ? onClick : undefined}
      >
        {isCompleted ? (
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
        ) : (
          <div className="h-3 w-3 rounded-full bg-gray-400 group-hover:bg-primary" />
        )}
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


const ClientDataTable = ({ clients, users, proposals, isAdmin }: { clients: WithId<Client>[], users: WithId<UserProfile>[], proposals: WithId<Proposal>[], isAdmin: boolean }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    const proposalsByClient = useMemo(() => {
        return proposals.reduce((acc, p) => {
            if (!acc[p.clientId]) {
                acc[p.clientId] = [];
            }
            acc[p.clientId].push(p);
            return acc;
        }, {} as { [key: string]: Proposal[] });
    }, [proposals]);

    const [paymentUploadState, setPaymentUploadState] = useState<{
        clientId: string;
        isUploading: boolean;
        date: Date | undefined;
        file: File | null;
        planName: string;
        planImage: string;
        amount: number;
    }>({
        clientId: '',
        isUploading: false,
        date: new Date(),
        file: null,
        planName: '',
        planImage: '',
        amount: 0,
    });
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    const defaultOnboardingSteps: Omit<OnboardingStep, 'date' | 'providerName' | 'providerLocation'>[] = [
        { title: 'Payment Confirmed', description: 'Initial subscription payment has been successfully processed.', status: 'pending' },
        { title: 'First Delivery Scheduled', description: 'The first batch of water and equipment is scheduled for delivery.', status: 'pending' },
        { title: 'Onboarding Call', description: 'Initial setup and account walkthrough call completed.', status: 'pending' },
        { title: 'Automated Refills Enabled', description: 'The smart refill system is now active.', status: 'pending' },
    ];
    
    const availableMonths = useMemo(() => {
        const monthSet = new Set<string>();
        clients.forEach(client => {
            if (client.createdAt) {
                const clientDate = new Date(client.createdAt);
                if (!isNaN(clientDate.getTime())) { // Check if the date is valid
                  monthSet.add(format(clientDate, 'MMMM yyyy'));
                }
            }
        });
        return Array.from(monthSet).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
    }, [clients]);

    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            const dateMatch = dateFilter === 'all' || (client.createdAt && format(new Date(client.createdAt), 'MMMM yyyy') === dateFilter);
            const statusMatch = statusFilter === 'all' || client.status === statusFilter;

            const searchMatch = searchQuery === '' || 
                client.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                client.id.toLowerCase().includes(searchQuery.toLowerCase());

            return dateMatch && searchMatch && statusMatch;
        });
    }, [clients, searchQuery, dateFilter, statusFilter]);


    const getOnboardingProgress = (onboardingStatus: OnboardingStep[] | undefined) => {
        if (!onboardingStatus || onboardingStatus.length === 0) return 0;
        const completedSteps = onboardingStatus.filter(step => step.status === 'completed').length;
        return (completedSteps / onboardingStatus.length) * 100;
    };
    
    const handleUpdateOnboarding = async (clientId: string, currentSteps: OnboardingStep[] | undefined, stepIndexToComplete: number) => {
        const clientRef = doc(firestore, 'clients', clientId);

        let stepsToUpdate: OnboardingStep[] = currentSteps 
            ? JSON.parse(JSON.stringify(currentSteps)) // Deep copy
            : defaultOnboardingSteps.map(s => ({ ...s, status: 'pending' } as OnboardingStep));

        stepsToUpdate[stepIndexToComplete].status = 'completed';
        stepsToUpdate[stepIndexToComplete].date = new Date().toLocaleDateString();

        const isLastStep = stepIndexToComplete === stepsToUpdate.length - 1;
        
        try {
            if (isLastStep) {
                 await updateDoc(clientRef, {
                    onboardingStatus: stepsToUpdate,
                    status: 'active'
                });
                toast({
                    title: "Onboarding Complete!",
                    description: "Client status has been updated to 'active'.",
                });
            } else {
                 await updateDoc(clientRef, {
                    onboardingStatus: stepsToUpdate,
                });
                toast({
                    title: "Onboarding Updated",
                    description: `Step ${stepIndexToComplete + 1} has been marked as complete.`,
                });
            }
        } catch (error) {
            console.error("Error updating onboarding status:", error);
            toast({
                variant: 'destructive',
                title: "Update Failed",
                description: "Could not update onboarding status.",
            });
        }
    };
    
    const handlePaymentStatusChange = async (clientId: string, newStatus: 'Paid' | 'Pending' | 'Unpaid') => {
        const clientRef = doc(firestore, 'clients', clientId);
        try {
            await updateDoc(clientRef, { paymentStatus: newStatus });
            toast({
                title: 'Payment Status Updated',
                description: `Client payment status changed to ${newStatus}.`
            });
        } catch (error) {
            console.error("Error updating payment status:", error);
            toast({
                variant: 'destructive',
                title: "Update Failed",
                description: "Could not update payment status.",
            });
        }
    };

    const handleUploadPayment = async () => {
        const { clientId, date, file, amount } = paymentUploadState;
        
        if (!clientId || !amount || !date || !file) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide all required details and a file.' });
            return;
        }

        setPaymentUploadState(prev => ({ ...prev, isUploading: true }));

        try {
            const storage = getStorage();
            const filePath = `payment_proofs/${clientId}/ongoing/${Date.now()}-${file.name}`;
            const storageRef = ref(storage, filePath);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const clientRef = doc(firestore, 'clients', clientId);
            await updateDoc(clientRef, {
                paymentHistory: arrayUnion({
                    date: date.toISOString(),
                    amount: amount,
                    proofUrl: downloadURL
                }),
                paymentStatus: 'Paid'
            });

            toast({ title: 'Payment Uploaded', description: 'The proof of payment has been added to the client\'s history.' });
            
            setPaymentUploadState({ clientId: '', isUploading: false, date: new Date(), file: null, planName: '', planImage: '', amount: 0 });

        } catch (error) {
            console.error('Error uploading payment:', error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload payment proof.' });
            setPaymentUploadState(prev => ({ ...prev, isUploading: false }));
        }
    };
    
    const clientTypeMap = {
        household: 'Family',
        sme: 'SME',
        commercial: 'Commercial',
        corporate: 'Corporate',
        enterprise: 'Enterprise'
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>All Clients</CardTitle>
                <CardDescription>A complete list of every client in the system.</CardDescription>
                <div className="flex items-center gap-2 pt-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by client name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                     <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-auto px-3">
                           <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            {availableMonths.map(month => <SelectItem key={month} value={month}>{month}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-auto px-3">
                           <Filter className="h-4 w-4 text-muted-foreground" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Payment Status</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Onboarding</TableHead>
                             <TableHead className="text-right">Proof of Payment</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClients.map(client => {
                            const clientProposals = proposalsByClient[client.id] || [];
                            const acceptedProposal = clientProposals.find(p => p.status === 'accepted');
                            const progress = getOnboardingProgress(client.onboardingStatus);
                            
                            const onboardingStepsToUse = (client.onboardingStatus && client.onboardingStatus.length > 0)
                                ? client.onboardingStatus
                                : defaultOnboardingSteps.map(s => ({ ...s, status: 'pending' }));
                            
                             let subscriptionDetails = {
                                planName: 'N/A',
                                amount: 0,
                                billingCycle: 'N/A'
                            };
                            
                           if (acceptedProposal) {
                                subscriptionDetails.amount = acceptedProposal.amount;
                                let planNameFromContent = 'Custom Plan';
                                let billingCycleFromContent = 'Monthly';
                                if (acceptedProposal.content) {
                                    try {
                                        const content = JSON.parse(acceptedProposal.content);
                                        planNameFromContent = content.summaryTitle || 'Custom Plan';
                                        billingCycleFromContent = content.billingCycleLabel || 'Monthly';
                                    } catch (e) { console.warn("Could not parse proposal content for client:", client.id); }
                                }
                                subscriptionDetails.planName = planNameFromContent;
                                subscriptionDetails.billingCycle = billingCycleFromContent;
                            } else if (client.subscription) {
                                subscriptionDetails = {
                                    planName: client.subscription.planName || 'N/A',
                                    amount: client.subscription.amount || 0,
                                    billingCycle: (client.subscription as any).billingCycle || 'Monthly',
                                };
                            }
                            
                            const paymentStatus = client.paymentStatus || (client.status === 'active' ? 'Paid' : 'Pending');
                            const clientTypeLabel = client.clientType ? clientTypeMap[client.clientType] : '';
                            const planImage = (client.clientType && planImages[client.clientType]) || planImages.sme;


                            return (
                                <TableRow key={client.id}>
                                    <TableCell>
                                        <ClientOverviewDialog client={client} proposal={acceptedProposal} allUsers={users} view="clients" isAdmin={isAdmin}>
                                            <div className="font-medium cursor-pointer text-primary hover:underline">{client.companyName}</div>
                                        </ClientOverviewDialog>
                                        <div className="font-mono text-xs text-muted-foreground">ID: {client.id}</div>
                                        <div className="space-y-1 mt-2">
                                             <h4 className="font-semibold text-sm">{clientTypeLabel ? `${clientTypeLabel} - ${subscriptionDetails.planName}` : subscriptionDetails.planName}</h4>
                                            <p className="font-bold text-lg">{currencyFormatter.format(subscriptionDetails.amount)}</p>
                                            <Badge variant="outline">{subscriptionDetails.billingCycle}</Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {isAdmin ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Badge variant="outline" className={cn("capitalize cursor-pointer", paymentStatusStyles[paymentStatus])}>
                                                        {paymentStatus}
                                                    </Badge>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => handlePaymentStatusChange(client.id, 'Paid')}>
                                                        Mark as Paid
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handlePaymentStatusChange(client.id, 'Pending')}>
                                                        Mark as Pending
                                                    </DropdownMenuItem>
                                                     <DropdownMenuItem onClick={() => handlePaymentStatusChange(client.id, 'Unpaid')}>
                                                        Mark as Unpaid
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : (
                                            <Badge variant="outline" className={cn("capitalize", paymentStatusStyles[paymentStatus])}>{paymentStatus}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("capitalize", client.status && clientStatusStyles[client.status])}>{client.status || 'N/A'}</Badge>
                                    </TableCell>
                                    <TableCell>
                                       {client.status === 'active' || client.status === 'pending' ? (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <button className="flex flex-col items-start gap-1 w-full text-left">
                                                         <Progress value={progress} className="w-24 h-2 bg-muted/50" indicatorClassName="bg-primary" />
                                                         <p className="text-xs text-muted-foreground">Click to update</p>
                                                    </button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Onboarding Progress: {client.companyName}</DialogTitle>
                                                        <DialogDescription>
                                                           {isAdmin ? 'Click a step to mark it as complete.' : 'Review the client\'s onboarding journey.'}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="py-4">
                                                        <div className="flex flex-col">
                                                            {onboardingStepsToUse.map((step, index) => (
                                                                <OnboardingStepItem
                                                                    key={index}
                                                                    step={step}
                                                                    isLast={index === onboardingStepsToUse.length - 1}
                                                                    onClick={() => handleUpdateOnboarding(client.id, client.onboardingStatus, index)}
                                                                    isAdmin={isAdmin}
                                                                    isCompleted={step.status === 'completed'}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                       ) : null}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {isAdmin && client.status === 'active' && (
                                            <Dialog onOpenChange={(open) => !open && setPaymentUploadState({ clientId: '', isUploading: false, date: new Date(), file: null, planName: '', planImage: '', amount: 0 })}>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" onClick={() => setPaymentUploadState(prev => ({...prev, clientId: client.id, planName: subscriptionDetails.planName, planImage: planImage, amount: subscriptionDetails.amount}))}>
                                                        <Upload className="mr-2 h-4 w-4" /> Upload
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle>Upload Payment Proof</DialogTitle>
                                                        <DialogDescription>For {client.companyName}'s next billing cycle of {currencyFormatter.format(subscriptionDetails.amount)}.</DialogDescription>
                                                    </DialogHeader>
                                                     <div className="space-y-4 py-4">
                                                        <Card className="overflow-hidden">
                                                            <div className="relative aspect-video">
                                                                {paymentUploadState.planImage && (
                                                                    <Image src={paymentUploadState.planImage} alt={paymentUploadState.planName} fill className="object-cover" />
                                                                )}
                                                            </div>
                                                            <CardHeader>
                                                                <CardTitle>{paymentUploadState.planName}</CardTitle>
                                                            </CardHeader>
                                                        </Card>
                                                        <div className="space-y-2">
                                                            <Label>Payment Date</Label>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !paymentUploadState.date && "text-muted-foreground")}>
                                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                                        {paymentUploadState.date ? format(paymentUploadState.date, "PPP") : <span>Pick a date</span>}
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0">
                                                                    <Calendar mode="single" selected={paymentUploadState.date} onSelect={(d) => setPaymentUploadState(prev => ({ ...prev, date: d }))} initialFocus />
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="payment-file">Proof of Payment File</Label>
                                                            <Input id="payment-file" type="file" ref={fileInputRef} onChange={(e) => setPaymentUploadState(prev => ({ ...prev, file: e.target.files?.[0] || null }))} accept="image/png, image/jpeg, application/pdf" />
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <DialogClose asChild>
                                                            <Button type="button" variant="secondary">Cancel</Button>
                                                        </DialogClose>
                                                        <Button onClick={handleUploadPayment} disabled={paymentUploadState.isUploading}>
                                                            {paymentUploadState.isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                            Confirm Upload
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

const SalesTeamLeaderboard = ({ users, proposals }: { users: WithId<UserProfile>[], proposals: WithId<Proposal>[] }) => {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

    const leaderboardData = useMemo(() => {
        const usersWithData = users.map(user => {
            const userProposals = proposals.filter(p => p.userId === user.id);
            const acceptedProposals = userProposals.filter(p => p.status === 'accepted');
            const sentProposals = userProposals.filter(p => ['sent', 'accepted', 'rejected', 'finalized'].includes(p.status));
            const totalRevenue = acceptedProposals.reduce((sum, p) => sum + p.amount, 0);
            const winRate = sentProposals.length > 0 ? (acceptedProposals.length / sentProposals.length) * 100 : 0;
            
            return {
                ...user,
                proposalsWon: acceptedProposals.length,
                totalRevenue,
                winRate
            };
        });

        // Add admin user if not present
        const adminUser = users.find(u => u.email === 'admin@smartrefill.io');
        if (adminUser) {
            const adminProposals = proposals.filter(p => p.userId === adminUser.id);
             const acceptedAdminProposals = adminProposals.filter(p => p.status === 'accepted');
            const sentAdminProposals = adminProposals.filter(p => ['sent', 'accepted', 'rejected', 'finalized'].includes(p.status));
            const totalAdminRevenue = acceptedAdminProposals.reduce((sum, p) => sum + p.amount, 0);
            const adminWinRate = sentAdminProposals.length > 0 ? (acceptedAdminProposals.length / sentAdminProposals.length) * 100 : 0;
            
            const adminIndex = usersWithData.findIndex(u => u.id === adminUser.id);
            const adminData = {
                ...adminUser,
                proposalsWon: acceptedAdminProposals.length,
                totalRevenue: totalAdminRevenue,
                winRate: adminWinRate
            };
            if (adminIndex > -1) {
                usersWithData[adminIndex] = adminData;
            } else {
                 usersWithData.push(adminData);
            }
        }

        return usersWithData.sort((a, b) => b.totalRevenue - a.totalRevenue);
    }, [users, proposals]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sales Team Leaderboard</CardTitle>
                <CardDescription>Performance ranking of all sales representatives.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Sales Rep</TableHead>
                            <TableHead>Proposals Won</TableHead>
                            <TableHead>Win Rate</TableHead>
                            <TableHead className="text-right">Total Revenue</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leaderboardData.map((rep, index) => (
                            <TableRow key={rep.id}>
                                <TableCell className="font-bold text-lg">
                                    {index === 0 && <Trophy className="w-6 h-6 text-yellow-400" />}
                                    {index === 1 && <Award className="w-6 h-6 text-gray-400" />}
                                    {index === 2 && <Award className="w-6 h-6 text-orange-400" />}
                                    {index > 2 && index + 1}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={rep.photoURL} />
                                            <AvatarFallback>{rep.displayName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{rep.displayName}</p>
                                            <p className="text-sm text-muted-foreground">{rep.email}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{rep.proposalsWon}</TableCell>
                                <TableCell>{rep.winRate.toFixed(1)}%</TableCell>
                                <TableCell className="text-right font-semibold">{currencyFormatter.format(rep.totalRevenue)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

const CommissionPayoutsTable = ({ commissions, users, clients, proposals }: { commissions: WithId<Commission>[], users: WithId<UserProfile>[], clients: WithId<Client>[], proposals: WithId<Proposal>[] }) => {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    
    // Create a map from proposalId to its client
    const proposalClientMap = useMemo(() => {
        const map = new Map<string, WithId<Client>>();
        proposals.forEach(proposal => {
            const client = clients.find(c => c.id === proposal.clientId);
            if (client) {
                map.set(proposal.id, client);
            }
        });
        return map;
    }, [clients, proposals]);


    const getClientName = (commission: Commission) => {
        if (commission.clientName) return commission.clientName;
        const client = proposalClientMap.get(commission.proposalId);
        return client ? client.companyName : 'N/A';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Commission Payouts</CardTitle>
                <CardDescription>A log of all commission records across the organization.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sales Rep</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {commissions.map(commission => {
                            const salesRep = userMap.get(commission.userId);
                            const clientName = getClientName(commission);
                            return (
                                <TableRow key={commission.id}>
                                    <TableCell>
                                        {salesRep ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={salesRep.photoURL} />
                                                    <AvatarFallback>{salesRep.displayName?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">{salesRep.displayName}</span>
                                            </div>
                                        ) : 'N/A'}
                                    </TableCell>
                                    <TableCell>{clientName}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("capitalize", commission.status && commissionStatusStyles[commission.status])}>
                                            {commission.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(commission.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right font-semibold">{currencyFormatter.format(commission.amount)}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};


const CustomBarLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  return (
    <text x={x + width / 2} y={y} fill="hsl(var(--foreground))" textAnchor="middle" dy={-6} fontSize={12}>
      {value}
    </text>
  );
};

const CustomXAxisTick = (props: any) => {
    const { x, y, payload, salesUsers } = props;
    const user = salesUsers.find((u: WithId<UserProfile>) => u.id === payload.value);
    
    if (user) {
        return (
            <g transform={`translate(${x},${y})`}>
                <foreignObject x={-16} y={8} width={32} height={32}>
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                        <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                </foreignObject>
            </g>
        );
    }
    return null;
}


export default function AdminPage() {
  const { proposals, isLoading: proposalsLoading } = useAllProposals();
  const { clients, isLoading: clientsLoading } = useAllClients();
  const { salesUsers, isLoading: usersLoading } = useSalesUsers();
  const { commissions, isLoading: commissionsLoading } = useAllCommissions();
  const { isAdmin } = useUser();
  const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

  const stats = useMemo(() => {
    if (proposalsLoading || clientsLoading || usersLoading) {
      return { totalRevenue: 0, activeClients: 0, salesReps: 0, winRate: 0, pendingClients: 0, totalProposals: 0, proposalPerClient: 0, planDistribution: [], clientStatusChartData: [], proposalFunnelData: [], proposalsByRep: [] };
    }

    const acceptedProposals = proposals.filter(p => p.status === 'accepted');
    const totalRevenue = acceptedProposals.reduce((sum, p) => sum + p.amount, 0);

    const activeClients = clients.filter(c => c.status === 'active').length;
    const pendingClients = clients.filter(c => c.status === 'pending').length;
    const totalClients = clients.length;
    const salesReps = salesUsers.length;

    const sentProposals = proposals.filter(p => ['sent', 'accepted', 'rejected', 'finalized'].includes(p.status));
    const sentProposalsCount = sentProposals.length;
    const winRate = sentProposalsCount > 0 ? (acceptedProposals.length / sentProposalsCount) * 100 : 0;
    const totalProposals = proposals.length;
    const proposalPerClient = totalClients > 0 ? totalProposals / totalClients : 0;
    
    const clientMap = new Map(clients.map(c => [c.id, c]));
    const clientTypeMap: { [key: string]: string } = {
        household: 'Family',
        sme: 'SME',
        commercial: 'Commercial',
        corporate: 'Corporate',
        enterprise: 'Enterprise'
    };
    
    const clientStatusChartData = [
      { name: 'Active', value: activeClients, fill: 'hsl(var(--chart-1))' },
      { name: 'Pending', value: pendingClients, fill: 'hsl(var(--chart-4))' },
      { name: 'Inactive', value: clients.filter(c => c.status === 'inactive').length, fill: 'hsl(var(--chart-2))' },
    ];

    const planCounts: { [key: string]: number } = {};
    acceptedProposals.forEach(p => {
        if (p.content) {
            try {
                const content = JSON.parse(p.content);
                const planName = content.summaryTitle?.replace(' Plan', '') || 'Unknown';
                let clientCategory = 'Other';

                // Check for custom enterprise plans first
                if (content.plan?.id?.includes('enterprise')) {
                    clientCategory = 'Enterprise';
                } else {
                    const client = clientMap.get(p.clientId);
                    if (client && client.clientType) {
                        clientCategory = clientTypeMap[client.clientType] || 'Other';
                    }
                }
                
                const fullPlanName = `${clientCategory} - ${planName}`;
                planCounts[fullPlanName] = (planCounts[fullPlanName] || 0) + 1;
            } catch (e) {
                console.warn("Could not parse proposal content:", e);
            }
        }
    });

    const planDistribution = Object.entries(planCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const now = new Date();
    const proposalFunnelData = Array.from({ length: 6 }).map((_, i) => {
        const date = subMonths(now, 5 - i);
        const monthName = format(date, 'MMM');
        const monthStart = startOfMonth(date);
        
        const cumulativeSent = sentProposals.filter(p => new Date(p.createdAt) <= endOfMonth(date)).length;
        const cumulativeAccepted = acceptedProposals.filter(p => new Date(p.createdAt) <= endOfMonth(date)).length;
        
        return { month: monthName, sent: cumulativeSent, accepted: cumulativeAccepted };
    });

    const proposalCountsByRep = proposals.reduce((acc, proposal) => {
        acc[proposal.userId] = (acc[proposal.userId] || 0) + 1;
        return acc;
    }, {} as { [key: string]: number });

    const proposalsByRep = Object.entries(proposalCountsByRep).map(([userId, count]) => {
        const user = salesUsers.find(u => u.id === userId);
        return {
            userId: userId,
            name: user?.displayName || 'Unknown',
            proposals: count
        };
    }).sort((a, b) => b.proposals - a.proposals);


    return { totalRevenue, activeClients, salesReps, winRate, pendingClients, totalProposals, proposalPerClient, planDistribution, clientStatusChartData, proposalFunnelData, proposalsByRep };
  }, [proposals, clients, salesUsers, proposalsLoading, clientsLoading, usersLoading]);

  const isLoading = proposalsLoading || clientsLoading || usersLoading || commissionsLoading;

  if (isLoading) {
    return <AdminDashboardSkeleton />;
  }
  
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="flex flex-col gap-8">
       <Tabs defaultValue="crm" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold whitespace-nowrap">Dashboard</h1>
              <TabsList className="gap-1">
                <TabsTrigger value="crm"><UsersRound className="mr-2 h-4 w-4"/>CRM</TabsTrigger>
                <TabsTrigger value="sales-team"><Users className="mr-2 h-4 w-4"/>Sales Team</TabsTrigger>
                <TabsTrigger value="payroll"><CreditCard className="mr-2 h-4 w-4"/>Payroll</TabsTrigger>
              </TabsList>
            </div>
             <p className="text-muted-foreground text-sm">
                Organization-wide overview
            </p>
        </div>

        <TabsContent value="crm" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.activeClients}</div>
                    <p className="text-xs text-muted-foreground">Currently subscribed clients</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Clients</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.pendingClients}</div>
                    <p className="text-xs text-muted-foreground">Awaiting activation</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalProposals}</div>
                    <p className="text-xs text-muted-foreground">Proposals created across all clients</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Proposals per Client</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.proposalPerClient.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Average proposals per client</p>
                  </CardContent>
                </Card>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Client Pipeline</CardTitle>
                        <CardDescription>Number of clients in each stage.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                       <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.clientStatusChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} />
                          <Bar dataKey="value" name="Clients" radius={[4, 4, 0, 0]}>
                            {stats.clientStatusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 />
                            Plan Distribution
                        </CardTitle>
                        <CardDescription>
                            Popularity of subscribed plans across all active clients.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.planDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                layout="vertical"
                                data={stats.planDistribution}
                                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis 
                                    type="category" 
                                    dataKey="name" 
                                    width={200}
                                    tick={{ fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                    contentStyle={{ backgroundColor: 'hsl(var(--background))' }}
                                />
                                <Bar dataKey="count" name="Subscriptions" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                                No subscription data available.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="flex flex-col gap-6">
                <ClientDataTable clients={clients} users={salesUsers} proposals={proposals} isAdmin={isAdmin} />
            </div>
        </TabsContent>
        <TabsContent value="sales-team" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sales Team</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.salesReps} Reps</div>
                    <p className="text-xs text-muted-foreground">Total sales representatives</p>
                  </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Proposal Funnel Over Time</CardTitle>
                        <CardDescription>Cumulative proposals sent vs. accepted over the last 6 months.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.proposalFunnelData}>
                                <defs>
                                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                                    </linearGradient>
                                    <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} />
                                <Legend />
                                <Area type="monotone" dataKey="sent" stroke="hsl(var(--chart-2))" fill="url(#colorSent)" />
                                <Area type="monotone" dataKey="accepted" stroke="hsl(var(--chart-1))" fill="url(#colorAccepted)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Proposals By Sales Rep</CardTitle>
                        <CardDescription>Total proposals created by each team member.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] pr-6">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.proposalsByRep} margin={{ top: 20, right: 0, left: 0, bottom: 20 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="userId" 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tick={<CustomXAxisTick salesUsers={salesUsers} />}
                                    interval={0}
                                />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                    contentStyle={{ 
                                        backgroundColor: 'hsl(var(--background))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: 'var(--radius)'
                                    }}
                                    labelFormatter={(value) => {
                                        const user = salesUsers.find(u => u.id === value);
                                        return user ? user.displayName : 'Unknown';
                                    }}
                                />
                                <Bar dataKey="proposals" fill="hsl(var(--primary))" radius={4} barSize={20} label={<CustomBarLabel />} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
            <SalesTeamLeaderboard users={salesUsers} proposals={proposals} />
        </TabsContent>
        <TabsContent value="payroll" className="mt-6 space-y-6">
             <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{currencyFormatter.format(stats.totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">From all accepted proposals</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">Based on all sent proposals</p>
                  </CardContent>
                </Card>
            </div>
            <CommissionPayoutsTable commissions={commissions} users={salesUsers} clients={clients} proposals={proposals} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

    

    

