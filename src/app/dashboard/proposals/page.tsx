
'use client';
import Link from "next/link";
import { useState, useMemo, useEffect } from 'react';
import {
  PlusCircle,
  FileText,
  Users,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Ship,
  User,
} from 'lucide-react';
import { cn } from "@/lib/utils";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClientOverviewDialog } from "@/components/client-overview-dialog";
import type { Client, Proposal, OnboardingStep } from "@/lib/definitions";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProposals } from '@/hooks/use-proposals';
import { useClients } from '@/hooks/use-clients';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Image from "next/image";
import { useSalesUsers } from "@/hooks/use-sales-users";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const proposalStatusStyles: { [key: string]: string } = {
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  finalized: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const clientStatusStyles: { [key: string]: string } = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  unpaid: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
};

export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'finalized';
export type ClientStatus = 'active' | 'unpaid' | 'pending';
export type ActiveView = 'proposals' | 'clients';

const planImages: { [key: string]: string } = {
  sme: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_SME.png?alt=media&token=e6beeb7b-3ed1-4e51-87cf-1b65b49041a1",
  commercial: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_Business.png?alt=media&token=b8536b3c-5199-460a-8612-003c99139d7c",
  corporate: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_Enterprise.png?alt=media&token=29e0d6a7-41f7-4511-a8b6-0369989421bd",
  enterprise: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Fwater_refill_Flow.png?alt=media&token=6b11f719-39e9-4ea4-b4a6-1bbe587bfa63",
  household: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FSmartRefill_Individual.png?alt=media&token=090d07c4-848a-4cd6-aab6-f7a5909ea839",
};

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

const defaultOnboardingSteps: OnboardingStep[] = [
    { title: 'Payment Confirmed', description: 'Initial subscription payment has been successfully processed.', status: 'pending' },
    { title: 'First Delivery Scheduled', description: 'The first batch of water and equipment is scheduled for delivery.', status: 'pending' },
    { title: 'Onboarding Call', description: 'Initial setup and account walkthrough call completed.', status: 'pending' },
    { title: 'Automated Refills Enabled', description: 'The smart refill system is now active.', status: 'pending' },
];

export default function ProposalsPage() {
  const [activeView, setActiveView] = useState<ActiveView>('proposals');
  const [searchQuery, setSearchQuery] = useState('');
  const proposalStatuses: (ProposalStatus | 'all')[] = ['all', 'draft', 'finalized', 'rejected'];
  const clientStatuses: ('all' | 'active' | 'unpaid')[] = ['all', 'active', 'unpaid'];
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'active' | 'unpaid'>('all');
  const [proposalStatusFilter, setProposalStatusFilter] = useState<ProposalStatus | 'all'>('all');

  const [proposalsCurrentPage, setProposalsCurrentPage] = useState(1);
  const [clientsCurrentPage, setClientsCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const { proposals, isLoading: proposalsLoading, error: proposalsError } = useProposals();
  const { clients, isLoading: clientsLoading, error: clientsError } = useClients();
  const { salesUsers, isLoading: usersLoading, error: usersError } = useSalesUsers();

  const handleTabChange = (value: string) => {
    setActiveView(value as ActiveView);
    setSearchQuery('');
  }
  
  const clientMap = useMemo(() => new Map(clients.map(client => [client.id, client])), [clients]);
  const userMap = useMemo(() => new Map(salesUsers.map(u => [u.id, u])), [salesUsers]);

  const renderProposalsTable = () => {
    const clientsWithProposals = useMemo(() => {
        if (proposalsLoading || clientsLoading) return [];
        
        const clientsMap = new Map<string, { client: Client, proposals: Proposal[] }>();
        
        proposals.forEach(proposal => {
            if (proposal.status === 'accepted') return;
            const client = clientMap.get(proposal.clientId);
            if (!client) return;

            if (!clientsMap.has(client.id)) {
                clientsMap.set(client.id, { client, proposals: [] });
            }
            clientsMap.get(client.id)!.proposals.push(proposal);
        });

        return Array.from(clientsMap.values()).filter(({ client }) => {
            const searchTerm = searchQuery.toLowerCase();
            return client.companyName.toLowerCase().includes(searchTerm) ||
                   client.contactName.toLowerCase().includes(searchTerm);
        });

    }, [proposals, clientMap, searchQuery, proposalsLoading, clientsLoading]);
    
    const totalPages = Math.ceil(clientsWithProposals.length / ITEMS_PER_PAGE);
    const paginatedClients = clientsWithProposals.slice(
      (proposalsCurrentPage - 1) * ITEMS_PER_PAGE,
      proposalsCurrentPage * ITEMS_PER_PAGE
    );

    if (proposalsLoading || clientsLoading || usersLoading) {
        return <div className="text-center p-8"><span className="animate-spin h-5 w-5 mr-3 ..."></span>Loading proposals...</div>
    }
    
    if (proposalsError || clientsError || usersError) {
        return <div className="text-center p-8 text-destructive">Error loading data. Please try again later.</div>
    }

    return (
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Proposals</TableHead>
                <TableHead className="hidden sm:table-cell">Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.length > 0 ? paginatedClients.map(({ client, proposals }) => {
                const latestProposal = proposals[0];
                return (
                  <ClientOverviewDialog key={client.id} client={client} proposal={latestProposal} allUsers={salesUsers} view="proposals" setActiveView={setActiveView}>
                    <TableRow className="cursor-pointer">
                      <TableCell>
                          <div className="font-bold">{client.companyName}</div>
                          <div className="font-mono text-xs text-muted-foreground">ID: {client.id}</div>
                          <div className="text-sm text-muted-foreground">{client.contactName}</div>
                      </TableCell>
                       <TableCell>
                          <Badge variant="outline">{proposals.length} Proposal(s)</Badge>
                       </TableCell>
                       <TableCell className="hidden sm:table-cell">
                          {new Date(latestProposal.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  </ClientOverviewDialog>
                )
              }) : (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        No proposals found.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter>
          <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {Math.min(paginatedClients.length, ITEMS_PER_PAGE)} of {clientsWithProposals.length} clients.
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProposalsCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={proposalsCurrentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProposalsCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={proposalsCurrentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    )
  }

  const renderClientsTable = () => {
    const filteredClients = useMemo(() => {
        return clients
            .filter(client => {
                if (client.status === 'pending') {
                    return false;
                }
                const matchesStatus = clientStatusFilter === 'all' || client.status === clientStatusFilter;
                if (!matchesStatus) return false;

                const searchTerm = searchQuery.toLowerCase();
                return (
                    client.companyName.toLowerCase().includes(searchTerm) ||
                    client.contactName.toLowerCase().includes(searchTerm) ||
                    client.contactEmail.toLowerCase().includes(searchTerm) ||
                    client.id.toLowerCase().includes(searchTerm)
                );
            });
    }, [clients, clientStatusFilter, searchQuery]);


    const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
    const paginatedClients = filteredClients.slice(
      (clientsCurrentPage - 1) * ITEMS_PER_PAGE,
      clientsCurrentPage * ITEMS_PER_PAGE
    );
      
    if (clientsLoading) {
        return <div className="text-center p-8"><span className="animate-spin h-5 w-5 mr-3 ..."></span>Loading clients...</div>
    }
    
    if (clientsError) {
        return <div className="text-center p-8 text-destructive">Error loading clients. Please try again later.</div>
    }

    return (
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="hidden sm:table-cell">Sales Rep</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Onboarding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.length > 0 ? paginatedClients.map((client) => {
                 const clientProposals = proposals.filter(p => p.clientId === client.id);
                 const acceptedProposal = clientProposals.find(p => p.status === 'accepted');
                 const latestProposal = clientProposals[0]; // Assumes proposals are sorted by date desc
                 const owner = userMap.get(latestProposal?.userId);


                 let subscriptionInfo = client.subscription;
                 if (!subscriptionInfo && acceptedProposal?.content) {
                     try {
                        const content = JSON.parse(acceptedProposal.content) as any;
                        const amountString = String(content.totalAmountDue || '0').replace(/[^0-9.-]+/g, "");
                        const cleanedAmount = parseFloat(amountString);

                        subscriptionInfo = {
                            planId: content.plan.id,
                            planName: content.summaryTitle,
                            liters: content.totalMonthlyLiters,
                            amount: cleanedAmount,
                            refillFrequency: content.refillFrequency,
                            employees: content.employees,
                            gallons: parseInt(content.refillableGallons) || 0,
                        };
                     } catch(e) {
                        console.error("Failed to parse subscription from proposal content:", e);
                     }
                 }

                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <ClientOverviewDialog client={client} view="clients" allUsers={salesUsers}>
                          <div className="font-bold text-primary cursor-pointer hover:underline">{client.companyName}</div>
                      </ClientOverviewDialog>
                        <div className="font-mono text-xs text-muted-foreground">Client ID: {client.id}</div>
                        <div className="text-sm text-muted-foreground">{client.contactName}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                        {owner ? (
                            <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={owner.photoURL ?? undefined} />
                                    <AvatarFallback className="text-xs">{owner.displayName?.[0]}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-sm">{owner.displayName}</span>
                            </div>
                        ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("capitalize", clientStatusStyles[client.status])} variant="outline">
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <Dialog>
                            <DialogTrigger asChild>
                                {client.onboardingStatus ? (
                                    <Button variant="outline" size="sm">View Progress</Button>
                                ) : (
                                    <Button variant="link" className="text-xs text-muted-foreground p-0 h-auto">Not Started</Button>
                                )}
                            </DialogTrigger>
                             <DialogContent className="sm:max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Onboarding Progress: {client.companyName}</DialogTitle>
                                    <DialogDescription>Tracking the client's journey to full activation.</DialogDescription>
                                </DialogHeader>
                                <div className="grid md:grid-cols-2 gap-6 py-4">
                                    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                                        {subscriptionInfo && <Image src={planImages[client.clientType || 'sme']} alt={subscriptionInfo.planName || 'Plan image'} fill className="object-cover" />}
                                    </div>
                                    <div>
                                        <div className="flex flex-col">
                                            {(client.onboardingStatus || defaultOnboardingSteps).map((step, index) => (
                                                <OnboardingStepItem 
                                                    key={index} 
                                                    step={step} 
                                                    isLast={index === (client.onboardingStatus || defaultOnboardingSteps).length - 1} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </TableCell>
                  </TableRow>
                )
              }) : (
                 <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No clients found.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
            <span>
                Page {clientsCurrentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setClientsCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={clientsCurrentPage === 1}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setClientsCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={clientsCurrentPage === totalPages}
                >
                    Next
                </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proposals &amp; Clients</h1>
      </div>

      <Button asChild size="icon" className="sm:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50">
        <Link href="/dashboard/proposals/new">
          <PlusCircle className="h-6 w-6" />
          <span className="sr-only">Create Proposal</span>
        </Link>
      </Button>

      <Tabs value={activeView} onValueChange={handleTabChange}>
        <TabsList>
            <TabsTrigger value="proposals"><FileText />Proposals</TabsTrigger>
            <TabsTrigger value="clients"><Users />Clients</TabsTrigger>
        </TabsList>
        <TabsContent value="proposals" className="mt-4">
            <Card>
              <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                          <CardTitle>All Proposals</CardTitle>
                          <CardDescription>
                              View, manage, and create sales proposals. Proposals are grouped by client.
                          </CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                          <div className="w-full sm:w-auto sm:max-w-sm">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input 
                                placeholder="Search by client name..." 
                                className="pl-10" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                              />
                            </div>
                        </div>
                      </div>
                  </div>
              </CardHeader>
              {renderProposalsTable()}
            </Card>
        </TabsContent>
        <TabsContent value="clients" className="mt-4">
             <Card>
                <CardHeader>
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                            <CardTitle>Clients</CardTitle>
                            <CardDescription>
                                Manage your clients and view their sales history.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                            <div className="w-full sm:w-auto sm:max-w-sm">
                                <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    placeholder="Search clients..." 
                                    className="pl-10" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                </div>
                            </div>
                            <Select value={clientStatusFilter} onValueChange={(value) => setClientStatusFilter(value as 'all' | 'active' | 'unpaid')}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                <SelectValue placeholder="Filter by status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                {clientStatuses.map(status => (
                                <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                {renderClientsTable()}
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
