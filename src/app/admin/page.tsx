

'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { FileText, Users, CircleDollarSign, Percent, CreditCard, UsersRound, Trophy, Award, Activity, Star, BarChart3, CheckCircle, MoreHorizontal, Clock, Ship, Bot, Upload, Search, Filter, CalendarDays, TrendingUp, LineChart as LineChartIcon, HeartCrack, ArrowUp, ArrowDown, Phone, Mail, FileSignature, Target, Bell, BadgeCheck } from 'lucide-react';
import { useAllProposals } from '@/hooks/use-all-proposals';
import { useAllClients } from '@/hooks/use-all-clients';
import { useSalesUsers } from '@/hooks/use-sales-users';
import { useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc, arrayUnion, writeBatch, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TFooter } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ClientOverviewDialog } from '@/components/client-overview-dialog';
import type { UserProfile, Client, Proposal, Commission, OnboardingStep } from '@/lib/definitions';
import { WithId } from '@/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line, Sector as RechartsPrimitiveSector, ComposedChart } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, getYear, getMonth, parse, isWithinInterval, subDays, sub, parseISO, isAfter } from 'date-fns';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCommissions } from '@/hooks/use-commissions';
import { PayoutHistoryDialog } from '@/components/payout-history-dialog';


const clientStatusStyles: { [key: string]: string } = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  unpaid: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
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
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
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
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    
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
                try {
                    // Try parsing as ISO string first, then as a generic date string
                    const clientDate = parseISO(client.createdAt);
                    if (!isNaN(clientDate.getTime())) {
                        monthSet.add(format(clientDate, 'MMMM yyyy'));
                    }
                } catch {
                    // Fallback for other potential date formats, though less reliable
                    try {
                        const clientDate = new Date(client.createdAt);
                         if (!isNaN(clientDate.getTime())) {
                            monthSet.add(format(clientDate, 'MMMM yyyy'));
                        }
                    } catch {}
                }
            }
        });
        return Array.from(monthSet).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
    }, [clients]);

    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            let dateMatch = dateFilter === 'all';
            if (dateFilter !== 'all' && client.createdAt) {
                try {
                    const clientDate = parseISO(client.createdAt);
                    if (!isNaN(clientDate.getTime())) {
                      dateMatch = format(clientDate, 'MMMM yyyy') === dateFilter;
                    }
                } catch {
                    dateMatch = false;
                }
            }
            
            const statusMatch = statusFilter === 'all' || client.status === statusFilter;

            const searchMatch = searchQuery === '' || 
                client.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                client.id.toLowerCase().includes(searchQuery.toLowerCase());

            return dateMatch && searchMatch && statusMatch;
        });
    }, [clients, searchQuery, dateFilter, statusFilter]);

    const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
    const paginatedClients = useMemo(() => {
        return filteredClients.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [filteredClients, currentPage]);


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
        
        if (!clientId || !file || !date || amount <= 0) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide all required details, a file, and ensure amount is greater than zero.' });
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
    
    const clientTypeMap: { [key: string]: string } = {
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
                        <SelectTrigger className="w-auto">
                            <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                           <SelectValue placeholder="Filter by date" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            {availableMonths.map(month => <SelectItem key={month} value={month}>{month}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="all" onValueChange={setStatusFilter} className="w-full">
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="pending">Pending</TabsTrigger>
                        <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
                    </TabsList>
                </Tabs>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Payment Status</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Onboarding</TableHead>
                            <TableHead className="text-right">Date Added</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedClients.map(client => {
                            const clientProposals = proposalsByClient[client.id] || [];
                            const acceptedProposal = clientProposals.find(p => p.status === 'accepted');
                            const progress = getOnboardingProgress(client.onboardingStatus);
                            
                            const onboardingStepsToUse = (client.onboardingStatus && client.onboardingStatus.length > 0)
                                ? client.onboardingStatus
                                : defaultOnboardingSteps.map(s => ({ ...s, status: 'pending' } as OnboardingStep));
                            
                            let subscriptionDetails = {
                                planName: 'N/A',
                                amount: 0,
                                billingCycle: 'N/A',
                                clientType: client.clientType,
                            };

                           if (acceptedProposal) {
                                let amount = acceptedProposal.amount || 0;
                                let planName = acceptedProposal.title || 'Custom Plan';
                                let billingCycle = 'Monthly';
                                let proposalClientType = client.clientType;
                            
                                if (acceptedProposal.content) {
                                    try {
                                        const content = JSON.parse(acceptedProposal.content);
                                        planName = content.summaryTitle || planName;
                                        billingCycle = content.billingCycleLabel || 'Monthly';
                                        
                                        // Prioritize the clientType from the proposal content
                                        if (content.clientType) {
                                            proposalClientType = content.clientType;
                                        }

                                        if (amount <= 0) {
                                          const parsedAmount = parseFloat(String(content.totalAmountDue || '0').replace(/[^0-9.-]+/g, ""));
                                          if (!isNaN(parsedAmount)) {
                                              amount = parsedAmount;
                                          }
                                        }
                                    } catch (e) {
                                        console.warn("Could not parse proposal content for client:", client.id, e);
                                    }
                                }
                                
                                subscriptionDetails = {
                                    amount: amount,
                                    planName: planName,
                                    billingCycle: billingCycle,
                                    clientType: proposalClientType,
                                };
                            } else if (client.subscription) {
                                subscriptionDetails = {
                                    planName: client.subscription.planName || 'N/A',
                                    amount: client.subscription.amount || 0,
                                    billingCycle: (client.subscription as any).billingCycle || 'Monthly',
                                    clientType: client.clientType,
                                };
                            }
                            
                            const paymentStatus = client.paymentStatus || (client.status === 'active' ? 'Paid' : 'Pending');
                            const clientTypeLabel = subscriptionDetails.clientType ? clientTypeMap[subscriptionDetails.clientType] : '';
                            const planImage = (subscriptionDetails.clientType && planImages[subscriptionDetails.clientType]) || planImages.sme;

                            const isNew = client.createdAt && isAfter(parseISO(client.createdAt), subDays(new Date(), 7));

                            return (
                                <TableRow key={client.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <ClientOverviewDialog client={client} proposal={acceptedProposal} allUsers={users} view="clients" isAdmin={isAdmin}>
                                                <div className="font-medium cursor-pointer text-primary hover:underline">{client.companyName}</div>
                                            </ClientOverviewDialog>
                                            {isNew && (
                                                <Badge variant="success" className="animate-pulse">
                                                    <BadgeCheck className="mr-1 h-3 w-3"/> New
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="font-mono text-xs text-muted-foreground">ID: {client.id}</div>
                                        <div className="space-y-1 mt-2">
                                             <h4 className="font-semibold text-sm">{clientTypeLabel ? `${clientTypeLabel} - ${subscriptionDetails.planName}` : subscriptionDetails.planName}</h4>
                                            <p className="font-bold text-lg text-primary">{currencyFormatter.format(subscriptionDetails.amount)}</p>
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
                                        {client.createdAt ? format(parseISO(client.createdAt), 'PPP') : 'N/A'}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter>
                <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                    <span>
                    Showing {Math.min(paginatedClients.length, ITEMS_PER_PAGE)} of {filteredClients.length} clients.
                    </span>
                    <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
};

const SalesTeamLeaderboard = ({ users, proposals }: { users: WithId<UserProfile>[], proposals: WithId<Proposal>[] }) => {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

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
        
        const filteredData = usersWithData.filter(rep => 
            rep.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return filteredData.sort((a, b) => b.totalRevenue - a.totalRevenue);
    }, [users, proposals, searchQuery]);
    
    const totalPages = Math.ceil(leaderboardData.length / ITEMS_PER_PAGE);
    const paginatedData = leaderboardData.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sales Team Leaderboard</CardTitle>
                <CardDescription>Performance ranking of all sales representatives.</CardDescription>
                 <div className="relative pt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by sales rep name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
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
                        {paginatedData.map((rep, index) => {
                            const rank = startIndex + index + 1;
                            return (
                                <TableRow key={rep.id}>
                                    <TableCell className="font-bold text-lg">
                                        {rank === 1 && <Trophy className="w-6 h-6 text-yellow-400" />}
                                        {rank === 2 && <Award className="w-6 h-6 text-gray-400" />}
                                        {rank === 3 && <Award className="w-6 h-6 text-orange-400" />}
                                        {rank > 3 && rank}
                                    </TableCell>
                                    <TableCell>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <div className="flex items-center gap-3 cursor-pointer">
                                                    <Avatar>
                                                        <AvatarImage src={rep.photoURL} />
                                                        <AvatarFallback>{rep.displayName?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium hover:underline">{rep.displayName}</p>
                                                        <p className="text-sm text-muted-foreground">{rep.email}</p>
                                                    </div>
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80">
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <Avatar className="h-16 w-16">
                                                            <AvatarImage src={rep.photoURL} />
                                                            <AvatarFallback className="text-xl">{rep.displayName?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <h3 className="font-semibold text-lg">{rep.displayName}</h3>
                                                            <p className="text-sm text-muted-foreground">{rep.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                                            <span>{rep.phone || 'N/A'}</span>
                                                        </div>
                                                         <div className="flex items-center gap-2">
                                                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                                            <span>{rep.birthday ? format(new Date(rep.birthday), 'PPP') : 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </TableCell>
                                    <TableCell>{rep.proposalsWon}</TableCell>
                                    <TableCell>{rep.winRate.toFixed(1)}%</TableCell>
                                    <TableCell className="text-right font-semibold">{currencyFormatter.format(rep.totalRevenue)}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter>
                <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                    <span>
                        Showing {Math.min(paginatedData.length, ITEMS_PER_PAGE)} of {leaderboardData.length} sales reps.
                    </span>
                    <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                    </div>
                </div>
            </CardFooter>
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

type PayoutMonthDetailsDialogProps = {
  month: string;
  commissions: WithId<Commission>[];
  users: WithId<UserProfile>[];
};

const PayoutMonthDetailsDialog = ({ month, commissions, users }: PayoutMonthDetailsDialogProps) => {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const totalAmount = commissions.reduce((sum, commission) => sum + commission.amount, 0);
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Payout Details for {month}</DialogTitle>
                <DialogDescription>Detailed breakdown of commissions and bonuses for this period.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[50vh] pr-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sales Rep</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {commissions.map((commission) => {
                            const user = userMap.get(commission.userId);
                            return (
                                <TableRow key={commission.id}>
                                    <TableCell>{user?.displayName || 'N/A'}</TableCell>
                                    <TableCell className="font-semibold">{commission.description || 'Commission'}</TableCell>
                                    <TableCell>{commission.clientName || 'N/A'}</TableCell>
                                    <TableCell className="text-right font-semibold">{currencyFormatter.format(commission.amount)}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                    <TFooter>
                        <TableRow>
                            <TableCell colSpan={3} className="text-right font-bold text-base">Total Payout</TableCell>
                            <TableCell className="text-right font-bold text-base">{currencyFormatter.format(totalAmount)}</TableCell>
                        </TableRow>
                    </TFooter>
                </Table>
            </ScrollArea>
        </DialogContent>
    );
};


export default function AdminPage() {
  const { proposals, isLoading: proposalsLoading } = useAllProposals();
  const { clients, isLoading: clientsLoading } = useAllClients();
  const { salesUsers, isLoading: usersLoading } = useSalesUsers();
  const { isAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
  const [planDistributionPeriod, setPlanDistributionPeriod] = useState('all');
  const [proposalsByRepPeriod, setProposalsByRepPeriod] = useState<string>('all');
  const [processingPayouts, setProcessingPayouts] = useState<Record<string, boolean>>({});

  const availableMonthsForRepProposals = useMemo(() => {
    if (!proposals) return [];
    const monthSet = new Set<string>();
    proposals.forEach(p => {
        if (p.createdAt) {
            try {
                const proposalDate = typeof p.createdAt === 'string' ? parseISO(p.createdAt) : new Date(p.createdAt);
                if (!isNaN(proposalDate.getTime())) {
                    monthSet.add(format(proposalDate, 'MMMM yyyy'));
                }
            } catch {}
        }
    });
    return Array.from(monthSet).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
  }, [proposals]);

  const stats = useMemo(() => {
    if (proposalsLoading || clientsLoading || usersLoading) {
      return { totalRevenue: 0, activeClients: 0, inactiveClients: 0, winRate: 0, pendingClients: 0, rejectedClients: 0, proposalsSent: 0, totalProposals: 0, proposalPerClient: 0, planDistribution: [], clientStatusChartData: [], proposalFunnelData: [], proposalsByRep: [], clientGrowthData: [], proposalStatusData: [], pendingClientsHistory: [], proposalsCreatedHistory: [], revenueHistory: [], clientRetentionData: [], proposalValueByStatus: [], revenueChange: 0, newClientsChange: 0, teamGrowthChange: 0, churnedClients: 0, topSellingPlansByMonth: [], teamWinRate: 0, teamTotalRevenue: 0, teamAvgDealSize: 0, teamProposalsSentChange: 0, teamWinRateChange: 0, teamTotalRevenueChange: 0, teamAvgDealSizeChange: 0 };
    }
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(lastMonthStart);

    const acceptedProposals = proposals.filter(p => p.status === 'accepted');
    const rejectedProposals = proposals.filter(p => p.status === 'rejected');
    const sentProposals = proposals.filter(p => ['sent', 'accepted', 'rejected', 'finalized'].includes(p.status));
    
    // Total Revenue
    const totalRevenue = acceptedProposals.reduce((sum, p) => sum + p.amount, 0);

    const getValidDate = (timestamp: string | number | undefined | Date) => {
        if (!timestamp) return null;
        try {
            const d = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
            return isNaN(d.getTime()) ? null : d;
        } catch {
            return null;
        }
    }

    const revenueThisMonth = acceptedProposals
      .filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: currentMonthStart, end: now }))
      .reduce((sum, p) => sum + p.amount, 0);
    const revenueLastMonth = acceptedProposals
      .filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: lastMonthStart, end: lastMonthEnd }))
      .reduce((sum, p) => sum + p.amount, 0);
    const revenueChange = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : revenueThisMonth > 0 ? 100 : 0;

    const newClientsThisMonth = clients.filter(c => c.createdAt && isWithinInterval(parseISO(c.createdAt), { start: currentMonthStart, end: now })).length;
    const newClientsLastMonth = clients.filter(c => c.createdAt && isWithinInterval(parseISO(c.createdAt), { start: lastMonthStart, end: lastMonthEnd })).length;
    const newClientsChange = newClientsLastMonth > 0 ? ((newClientsThisMonth - newClientsLastMonth) / newClientsLastMonth) * 100 : newClientsThisMonth > 0 ? 100 : 0;

    const activeClients = clients.filter(c => c.status === 'active').length;
    const inactiveClients = clients.filter(c => c.status === 'unpaid').length;
    const churnedClients = clients.filter(c => c.status === 'unpaid' && c.updatedAt && isWithinInterval(parseISO(c.updatedAt), { start: currentMonthStart, end: now })).length;

    const newSalesRepsThisMonth = salesUsers.filter(u => u.createdAt && isWithinInterval(parseISO(u.createdAt), { start: currentMonthStart, end: now })).length;
    const newSalesRepsLastMonth = salesUsers.filter(u => u.createdAt && isWithinInterval(parseISO(u.createdAt), { start: lastMonthStart, end: lastMonthEnd })).length;
    const teamGrowthChange = newSalesRepsLastMonth > 0 ? ((newSalesRepsThisMonth - newSalesRepsLastMonth) / newSalesRepsLastMonth) * 100 : newSalesRepsThisMonth > 0 ? 100 : 0;

    const pendingClients = clients.filter(c => c.status === 'pending').length;
    const rejectedClientIds = new Set(rejectedProposals.map(p => p.clientId));
    const rejectedClients = rejectedClientIds.size;
    const totalClients = clients.length;
    
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
    
    let filteredProposals = acceptedProposals;
    if (planDistributionPeriod !== 'all') {
        let startDate: Date;
        if (planDistributionPeriod === '30d') {
            startDate = subDays(now, 30);
        } else if (planDistributionPeriod === '6m') {
            startDate = subMonths(now, 6);
        } else if (planDistributionPeriod === '12m') {
            startDate = subMonths(now, 12);
        } else {
             startDate = new Date(0);
        }
        filteredProposals = acceptedProposals.filter(p => {
             const createdAt = p.createdAt ? (typeof p.createdAt === 'string' ? parseISO(p.createdAt) : new Date(p.createdAt)) : null;
             return createdAt && createdAt >= startDate;
        });
    }

    const planCounts: { [key: string]: number } = {};
    filteredProposals.forEach(p => {
        if (p.content) {
            try {
                const content = JSON.parse(p.content);
                const planName = content.summaryTitle?.replace(' Plan', '') || 'Unknown';
                let clientCategory = 'Other';

                if (content.clientType && clientTypeMap[content.clientType]) {
                    clientCategory = clientTypeMap[content.clientType];
                } else {
                    const client = clientMap.get(p.clientId);
                    if (client && client.clientType && clientTypeMap[client.clientType]) {
                        clientCategory = clientTypeMap[client.clientType];
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
    
    const monthlyData = Array.from({ length: 6 }).map((_, i) => {
        const date = subMonths(now, 5 - i);
        const monthName = format(date, 'MMM');
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        
        const newClients = clients.filter(c => getValidDate(c.createdAt) && isWithinInterval(getValidDate(c.createdAt)!, { start: monthStart, end: monthEnd })).length;
        const endOfMonthPendingClients = clients.filter(c => getValidDate(c.createdAt) && c.status === 'pending' && getValidDate(c.createdAt)! <= monthEnd).length;
        const endOfMonthRejectedProposals = rejectedProposals.filter(p => getValidDate(p.createdAt) && getValidDate(p.createdAt)! <= monthEnd);
        const endOfMonthRejectedClients = new Set(endOfMonthRejectedProposals.map(p => p.clientId)).size;
        const endOfMonthActiveClients = clients.filter(c => getValidDate(c.createdAt) && c.status === 'active' && getValidDate(c.createdAt)! <= monthEnd).length;
        const endOfMonthInactiveClients = clients.filter(c => getValidDate(c.createdAt) && c.status === 'unpaid' && getValidDate(c.createdAt)! <= monthEnd).length;
        const proposalsCreated = proposals.filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: monthStart, end: monthEnd })).length;
        const proposalsAccepted = acceptedProposals.filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: monthStart, end: monthEnd }));
        const monthlyRevenue = proposalsAccepted.reduce((sum, p) => sum + p.amount, 0);

        return { month: monthName, newClients, proposalsCreated, proposalsAccepted: proposalsAccepted.length, pendingClients: endOfMonthPendingClients, rejectedClients: endOfMonthRejectedClients, revenue: monthlyRevenue, active: endOfMonthActiveClients, inactive: endOfMonthInactiveClients };
    });
    
    const clientGrowthData = monthlyData.map(d => ({ month: d.month, "New Clients": d.newClients, "Pending Clients": d.pendingClients, "Rejected Clients": d.rejectedClients }));
    const proposalsCreatedHistory = monthlyData.map(d => ({ month: d.month, "Proposals Created": d.proposalsCreated }));
    const revenueHistory = monthlyData.map(d => ({ month: d.month, "Revenue": d.revenue }));
    const clientRetentionData = monthlyData.map(d => ({ month: d.month, "Active": d.active, "Inactive": d.inactive }));
    
    const proposalFunnelData = Array.from({ length: 6 }).map((_, i) => {
        const date = subMonths(now, 5 - i);
        const monthName = format(date, 'MMM');
        const endOfMonthDate = endOfMonth(date);
        
        const cumulativeSent = sentProposals.filter(p => getValidDate(p.createdAt) && getValidDate(p.createdAt)! <= endOfMonthDate).length;
        const cumulativeAccepted = acceptedProposals.filter(p => getValidDate(p.createdAt) && getValidDate(p.createdAt)! <= endOfMonthDate).length;
        
        return { month: monthName, sent: cumulativeSent, accepted: cumulativeAccepted };
    });

    const proposalStatusData = [
        { name: 'Draft', value: proposals.filter(p => p.status === 'draft').length, fill: 'hsl(var(--muted-foreground))' },
        { name: 'Sent', value: proposals.filter(p => p.status === 'sent').length, fill: 'hsl(var(--chart-2))' },
        { name: 'Finalized', value: proposals.filter(p => p.status === 'finalized').length, fill: 'hsl(var(--chart-5))' },
        { name: 'Accepted', value: proposals.filter(p => p.status === 'accepted').length, fill: 'hsl(var(--chart-1))' },
        { name: 'Rejected', value: proposals.filter(p => p.status === 'rejected').length, fill: 'hsl(var(--destructive))' },
    ];
    
    const proposalValueByStatus = [
        { name: 'Draft', value: proposals.filter(p => p.status === 'draft').reduce((sum, p) => sum + p.amount, 0), fill: 'hsl(var(--muted-foreground))' },
        { name: 'Sent', value: proposals.filter(p => p.status === 'sent').reduce((sum, p) => sum + p.amount, 0), fill: 'hsl(var(--chart-2))' },
        { name: 'Accepted', value: proposals.filter(p => p.status === 'accepted').reduce((sum, p) => sum + p.amount, 0), fill: 'hsl(var(--chart-1))' },
        { name: 'Rejected', value: proposals.filter(p => p.status === 'rejected').reduce((sum, p) => sum + p.amount, 0), fill: 'hsl(var(--destructive))' },
    ];

    const filteredRepProposals = proposalsByRepPeriod === 'all'
        ? proposals
        : proposals.filter(p => {
            if (!p.createdAt) return false;
            try {
                const proposalDate = typeof p.createdAt === 'string' ? parseISO(p.createdAt) : new Date(p.createdAt);
                return format(proposalDate, 'MMMM yyyy') === proposalsByRepPeriod;
            } catch {
                return false;
            }
        });

    const proposalCountsByRep = filteredRepProposals.reduce((acc, proposal) => {
        acc[proposal.userId] = (acc[proposal.userId] || 0) + 1;
        return acc;
    }, {} as { [key: string]: number });


    const proposalsByRep = Object.entries(proposalCountsByRep).map(([userId, count]) => {
        const user = salesUsers.find(u => u.id === userId);
        const userProposals = filteredRepProposals.filter(p => p.userId === userId);
        return {
            userId: userId,
            name: user?.displayName || 'Unknown',
            proposals: count,
            createdAt: userProposals[0]?.createdAt // Example of how you might add it
        };
    }).sort((a, b) => b.proposals - a.proposals);
    
    const topSellingPlansByMonth = Array.from({ length: 6 }).map((_, i) => {
        const date = subMonths(now, i);
        const monthName = format(date, 'MMMM yyyy');
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);

        const monthlyProposals = acceptedProposals.filter(p => {
             const createdAt = p.createdAt ? (typeof p.createdAt === 'string' ? parseISO(p.createdAt) : new Date(p.createdAt)) : null;
             return createdAt && isWithinInterval(createdAt, { start: monthStart, end: monthEnd });
        });
        
        if (monthlyProposals.length === 0) {
            return { month: monthName, plan: null, count: 0 };
        }

        const counts: { [key: string]: number } = {};
        monthlyProposals.forEach(p => {
             if (p.content) {
                try {
                    const content = JSON.parse(p.content);
                    const planName = content.summaryTitle || 'Unknown';
                    counts[planName] = (counts[planName] || 0) + 1;
                } catch {}
            }
        });
        
        const topPlan = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        
        return { month: monthName, plan: topPlan[0], count: topPlan[1] };
    });

    const sentProposalsThisMonth = sentProposals.filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: currentMonthStart, end: now }));
    const sentProposalsLastMonth = sentProposals.filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: lastMonthStart, end: lastMonthEnd }));
    const teamProposalsSentChange = sentProposalsLastMonth.length > 0 ? ((sentProposalsThisMonth.length - sentProposalsLastMonth.length) / sentProposalsLastMonth.length) * 100 : sentProposalsThisMonth.length > 0 ? 100 : 0;
    
    const acceptedThisMonth = acceptedProposals.filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: currentMonthStart, end: now }));
    const acceptedLastMonth = acceptedProposals.filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: lastMonthStart, end: lastMonthEnd }));

    const teamWinRateThisMonth = sentProposalsThisMonth.length > 0 ? (acceptedThisMonth.length / sentProposalsThisMonth.length) * 100 : 0;
    const teamWinRateLastMonth = sentProposalsLastMonth.length > 0 ? (acceptedLastMonth.length / sentProposalsLastMonth.length) * 100 : 0;
    const teamWinRateChange = teamWinRateLastMonth > 0 ? ((teamWinRateThisMonth - teamWinRateLastMonth) / teamWinRateLastMonth) * 100 : teamWinRateThisMonth > 0 ? 100 : 0;

    const teamTotalRevenueThisMonth = acceptedThisMonth.reduce((sum, p) => sum + p.amount, 0);
    const teamTotalRevenueLastMonth = acceptedLastMonth.reduce((sum, p) => sum + p.amount, 0);
    const teamTotalRevenueChange = teamTotalRevenueLastMonth > 0 ? ((teamTotalRevenueThisMonth - teamTotalRevenueLastMonth) / teamTotalRevenueLastMonth) * 100 : teamTotalRevenueThisMonth > 0 ? 100 : 0;

    const teamAvgDealSizeThisMonth = acceptedThisMonth.length > 0 ? teamTotalRevenueThisMonth / acceptedThisMonth.length : 0;
    const teamAvgDealSizeLastMonth = acceptedLastMonth.length > 0 ? teamTotalRevenueLastMonth / acceptedLastMonth.length : 0;
    const teamAvgDealSizeChange = teamAvgDealSizeLastMonth > 0 ? ((teamAvgDealSizeThisMonth - teamAvgDealSizeLastMonth) / teamAvgDealSizeLastMonth) * 100 : teamAvgDealSizeThisMonth > 0 ? 100 : 0;

    const teamWinRate = sentProposalsCount > 0 ? (acceptedProposals.length / sentProposalsCount) * 100 : 0;
    const teamTotalRevenue = acceptedProposals.reduce((sum,p) => sum + p.amount, 0);
    const teamAvgDealSize = acceptedProposals.length > 0 ? teamTotalRevenue / acceptedProposals.length : 0;


    return { totalRevenue, activeClients, inactiveClients, winRate, pendingClients, rejectedClients, proposalsSent: sentProposalsCount, totalProposals, proposalPerClient, planDistribution, clientGrowthData, proposalFunnelData, proposalsByRep, proposalStatusData, proposalsCreatedHistory, revenueHistory, clientRetentionData, proposalValueByStatus, revenueChange, newClientsChange, teamGrowthChange, churnedClients, topSellingPlansByMonth, teamWinRate, teamTotalRevenue, teamAvgDealSize, teamProposalsSentChange, teamWinRateChange, teamTotalRevenueChange, teamAvgDealSizeChange };
  }, [proposals, clients, salesUsers, proposalsLoading, clientsLoading, usersLoading, planDistributionPeriod, proposalsByRepPeriod]);
  
  const userIds = useMemo(() => salesUsers.filter(u => u.role !== 'admin').map(u => u.id), [salesUsers]);
  const { allPayouts, commissions: commissionsFromHook, isLoading: commissionsLoading } = useCommissions(userIds);

  const salesRepPayouts = useMemo(() => {
    if (commissionsLoading || usersLoading) return [];

    const payoutsByUser = allPayouts.reduce((acc, payout) => {
        const userId = payout.commissions[0]?.userId;
        if (userId) {
            if (!acc[userId]) {
                acc[userId] = [];
            }
            acc[userId].push(payout);
        }
        return acc;
    }, {} as Record<string, typeof allPayouts>);

    return salesUsers
      .filter(user => user.role !== 'admin')
      .map(user => {
        const userPayouts = payoutsByUser[user.id] || [];
        const pendingAmount = userPayouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.totalAmount, 0);
        const paidAmount = userPayouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.totalAmount, 0);
        
        return {
            user,
            pendingAmount,
            paidAmount,
        };
      });
  }, [salesUsers, allPayouts, commissionsLoading, usersLoading]);

  const handleProcessPayout = (payoutId: string, commissionsToUpdate: WithId<Commission>[], userToNotify: WithId<UserProfile>) => {
      if (!firestore) return;
      
      setProcessingPayouts(prev => ({...prev, [payoutId]: true}));
      
      const batch = writeBatch(firestore);
      const monthName = payoutId.split('-').slice(1).join('-');

      commissionsToUpdate.forEach(commission => {
            const commissionRef = doc(firestore, 'commissions', commission.id);
            // Use set with merge instead of update to handle new bonus/override commissions
            batch.set(commissionRef, {
                ...commission,
                status: 'paid'
            }, { merge: true });
      });

      // Create a notification for the user
      const notificationRef = collection(firestore, `users/${userToNotify.id}/notifications`);
      const payoutAmount = commissionsToUpdate.reduce((sum, c) => sum + c.amount, 0);
      const notificationData = {
          title: "Payout Processed",
          message: `Your payout for ${monthName} amounting to ${currencyFormatter.format(payoutAmount)} has been successfully processed.`,
          isRead: false,
          createdAt: serverTimestamp(),
          type: 'payout'
      };

      addDoc(notificationRef, notificationData).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: notificationRef.path,
          operation: 'create', 
          requestResourceData: notificationData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
      
      batch.commit().then(() => {
          toast({
              title: "Payout Processed",
              description: `The ${monthName} payout for ${userToNotify.displayName} has been marked as paid and a notification has been sent.`,
          });
      }).catch(async (error) => {
          const permissionError = new FirestorePermissionError({
            path: 'commissions',
            operation: 'write', 
            requestResourceData: commissionsToUpdate.map(c => ({...c, status: 'paid'})),
          });
          errorEmitter.emit('permission-error', permissionError);
      }).finally(() => {
          setProcessingPayouts(prev => ({...prev, [payoutId]: false}));
      });
  };

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
  
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
    return (
        <g>
            <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="hsl(var(--foreground))" className="text-xl font-bold">
                {payload.value}
            </text>
            <text x={cx} y={cy} dy={10} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-sm">
                {payload.name}
            </text>
            <RechartsPrimitiveSector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 5}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
        </g>
    );
  };

  return (
    <div className="flex flex-col gap-8">
       <Tabs defaultValue="crm" className="w-full">
        <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Organization-wide overview</p>
        </div>
        
        <div className="mt-4">
            <TabsList>
                <TabsTrigger value="crm"><UsersRound className="mr-2 h-4 w-4"/>CRM</TabsTrigger>
                <TabsTrigger value="sales-team"><Users className="mr-2 h-4 w-4"/>Sales Team</TabsTrigger>
                <TabsTrigger value="payroll"><CreditCard className="mr-2 h-4 w-4"/>Payroll</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="crm" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 <Dialog>
                    <DialogTrigger asChild>
                        <Card className="cursor-pointer hover:border-primary transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{currencyFormatter.format(stats.totalRevenue)}</div>
                                <p className={cn("text-xs text-muted-foreground flex items-center", stats.revenueChange >= 0 ? "text-green-600" : "text-red-600")}>
                                    {stats.revenueChange >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                    {stats.revenueChange.toFixed(1)}% from last month
                                </p>
                            </CardContent>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-3xl">
                        <DialogHeader>
                             <div className="flex items-center gap-2">
                                <TrendingUp className="h-6 w-6 text-primary"/>
                                <DialogTitle>Revenue Deep Dive</DialogTitle>
                            </div>
                            <DialogDescription>A detailed look at key revenue and sales activity metrics.</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 gap-6 py-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Revenue Growth (6 Months)</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.revenueHistory}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                                            <YAxis tickFormatter={(value) => `₱${Number(value) / 1000}k`} axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} width={80} />
                                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} formatter={(value) => [currencyFormatter.format(Number(value)), "Revenue"]} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                            <Area type="monotone" dataKey="Revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Proposals Created</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[250px]">
                                         <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.proposalsCreatedHistory}>
                                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} cursor={{ fill: 'hsl(var(--muted))' }} />
                                                <Bar dataKey="Proposals Created" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                 <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Proposal Funnel</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={stats.proposalFunnelData}>
                                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                                <Legend wrapperStyle={{paddingTop: '20px'}} />
                                                <Line type="monotone" dataKey="sent" name="Sent" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                                                <Line type="monotone" dataKey="accepted" name="Accepted" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
                <Dialog>
                    <DialogTrigger asChild>
                         <Card className="cursor-pointer hover:border-primary transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">New Clients</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.activeClients} Active</div>
                                <p className={cn("text-xs text-muted-foreground flex items-center", stats.newClientsChange >= 0 ? "text-green-600" : "text-red-600")}>
                                     {stats.newClientsChange >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                    {stats.newClientsChange.toFixed(1)}% from last month
                                </p>
                            </CardContent>
                        </Card>
                    </DialogTrigger>
                     <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                             <div className="flex items-center gap-2">
                                <LineChartIcon className="h-6 w-6 text-primary"/>
                                <DialogTitle>Client Funnel Growth</DialogTitle>
                            </div>
                            <DialogDescription>Client status trends over the last 6 months.</DialogDescription>
                        </DialogHeader>
                        <div className="h-[350px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.clientGrowthData}>
                                     <defs>
                                        <linearGradient id="colorNewClients" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                                        </linearGradient>
                                        <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0.1}/>
                                        </linearGradient>
                                         <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                    <Legend wrapperStyle={{paddingTop: '20px'}} />
                                    <Line type="monotone" dataKey="New Clients" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                                    <Line type="monotone" dataKey="Pending Clients" stroke="hsl(var(--chart-4))" strokeWidth={2} />
                                    <Line type="monotone" dataKey="Rejected Clients" stroke="hsl(var(--destructive))" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </DialogContent>
                </Dialog>
                 <Dialog>
                    <DialogTrigger asChild>
                        <Card className="cursor-pointer hover:border-primary transition-colors">
                           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Client Churn</CardTitle>
                                <HeartCrack className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.churnedClients} This Month</div>
                                <p className="text-xs text-muted-foreground">{stats.inactiveClients} total unpaid clients</p>
                            </CardContent>
                        </Card>
                    </DialogTrigger>
                     <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Client Retention & Churn</DialogTitle>
                            <DialogDescription>Active vs. Unpaid clients over the last 6 months.</DialogDescription>
                        </DialogHeader>
                        <div className="h-[350px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.clientRetentionData}>
                                     <defs>
                                        <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                                        </linearGradient>
                                         <linearGradient id="colorInactive" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                    <Legend wrapperStyle={{paddingTop: '20px'}} />
                                    <Area type="monotone" dataKey="Active" stroke="hsl(var(--chart-1))" strokeWidth={2} fillOpacity={1} fill="url(#colorActive)" />
                                    <Area type="monotone" dataKey="Inactive" name="Unpaid" stroke="hsl(var(--destructive))" strokeWidth={2} fillOpacity={1} fill="url(#colorInactive)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
             <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 />
                                    Plan Distribution
                                </CardTitle>
                                <CardDescription>
                                    Popularity of subscribed plans.
                                </CardDescription>
                            </div>
                             <Select value={planDistributionPeriod} onValueChange={setPlanDistributionPeriod}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="12m">Last 12 Months</SelectItem>
                                    <SelectItem value="6m">Last 6 Months</SelectItem>
                                    <SelectItem value="30d">Last 30 Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {stats.planDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                layout="vertical"
                                data={stats.planDistribution}
                                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                                <YAxis 
                                    type="category" 
                                    dataKey="name" 
                                    width={200}
                                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: 'var(--radius)' }}
                                />
                                <Bar dataKey="count" name="Subscriptions" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                                No subscription data available for the selected period.
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base">Monthly Top Sellers</CardTitle>
                        <CardDescription>
                            The most popular plan for each of the last 6 months.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[250px]">
                            <div className="space-y-4">
                                {stats.topSellingPlansByMonth.map((item, index) => (
                                    <div key={index}>
                                        <p className="text-sm font-semibold text-muted-foreground">{item.month}</p>
                                        {item.plan ? (
                                            <div className="flex items-center justify-between mt-1">
                                                <p className="font-bold text-primary truncate pr-2">{item.plan}</p>
                                                <Badge variant="outline">Sold: {item.count}</Badge>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground mt-1">No sales data</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
            <div className="flex flex-col gap-6">
                <ClientDataTable clients={clients} users={salesUsers} proposals={proposals} isAdmin={isAdmin} />
            </div>
        </TabsContent>
        <TabsContent value="sales-team" className="mt-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Team Performance Overview</CardTitle>
                    <CardDescription>A quick look at the team's key performance indicators.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Proposals Sent</CardTitle>
                            <FileSignature className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.proposalsSent}</div>
                             <p className={cn("text-xs text-muted-foreground flex items-center", stats.teamProposalsSentChange >= 0 ? "text-green-600" : "text-red-600")}>
                                {stats.teamProposalsSentChange >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                {stats.teamProposalsSentChange.toFixed(1)}% from last month
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Team Win Rate</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.teamWinRate.toFixed(1)}%</div>
                            <p className={cn("text-xs text-muted-foreground flex items-center", stats.teamWinRateChange >= 0 ? "text-green-600" : "text-red-600")}>
                                {stats.teamWinRateChange >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                {stats.teamWinRateChange.toFixed(1)}% from last month
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue Generated</CardTitle>
                            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{currencyFormatter.format(stats.teamTotalRevenue)}</div>
                             <p className={cn("text-xs text-muted-foreground flex items-center", stats.teamTotalRevenueChange >= 0 ? "text-green-600" : "text-red-600")}>
                                {stats.teamTotalRevenueChange >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                {stats.teamTotalRevenueChange.toFixed(1)}% from last month
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Average Deal Size</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{currencyFormatter.format(stats.teamAvgDealSize)}</div>
                             <p className={cn("text-xs text-muted-foreground flex items-center", stats.teamAvgDealSizeChange >= 0 ? "text-green-600" : "text-red-600")}>
                                {stats.teamAvgDealSizeChange >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                {stats.teamAvgDealSizeChange.toFixed(1)}% from last month
                            </p>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
            <Card className="col-span-full">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Proposals By Sales Rep</CardTitle>
                            <CardDescription>Total proposals created by each team member.</CardDescription>
                        </div>
                        <Select value={proposalsByRepPeriod} onValueChange={setProposalsByRepPeriod}>
                            <SelectTrigger className="w-auto px-3">
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                {availableMonthsForRepProposals.map(month => <SelectItem key={month} value={month}>{month}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sales Rep</TableHead>
                                <TableHead>Proposals</TableHead>
                                <TableHead>Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.proposalsByRep.map(rep => (
                                <TableRow key={rep.userId}>
                                    <TableCell>{rep.name}</TableCell>
                                    <TableCell>{rep.proposals}</TableCell>
                                    <TableCell>{rep.createdAt ? format(new Date(rep.createdAt), 'PPP') : 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <SalesTeamLeaderboard users={salesUsers} proposals={proposals} />
        </TabsContent>
        <TabsContent value="payroll" className="mt-6 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Payroll Processing</CardTitle>
                    <CardDescription>Review and process monthly payouts for the sales team.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sales Rep</TableHead>
                                <TableHead>Pending Payout</TableHead>
                                <TableHead>Total Paid</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                                    </TableCell>
                                </TableRow>
                            ) : salesRepPayouts.filter(p => p?.user.role !== 'admin').length > 0 ? (
                                salesRepPayouts.filter(p => p?.user.role !== 'admin').map((payout) => {
                                    if (!payout) return null;
                                    const { user, pendingAmount, paidAmount } = payout;
                                    return (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={user?.photoURL} />
                                                        <AvatarFallback>{user?.displayName?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{user?.displayName}</p>
                                                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-semibold">{currencyFormatter.format(pendingAmount)}</TableCell>
                                            <TableCell>{currencyFormatter.format(paidAmount)}</TableCell>
                                            <TableCell className="text-center">
                                                 <PayoutHistoryDialog 
                                                    user={user}
                                                    isAdmin={true}
                                                    onProcessPayout={(payoutId, commissions) => handleProcessPayout(payoutId, commissions, user)}
                                                    processingPayouts={processingPayouts}
                                                 >
                                                    <Button variant="outline" size="sm">View Payouts</Button>
                                                </PayoutHistoryDialog>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No sales representatives found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
    

    









    




    



    


