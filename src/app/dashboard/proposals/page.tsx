
'use client';
import Link from "next/link";
import { useState } from 'react';
import {
  PlusCircle,
  FileText,
  Users,
} from 'lucide-react';
import { cn } from "@/lib/utils";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import { proposals, clients } from '@/lib/data';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ClientOverviewDialog } from "@/components/client-overview-dialog";
import type { Client } from "@/lib/definitions";


const proposalStatusStyles: { [key: string]: string } = {
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const clientStatusStyles: { [key: string]: string } = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  lead: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
};

type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected';
type ClientStatus = 'active' | 'inactive' | 'lead';
type ActiveView = 'proposals' | 'clients';

function NavLink({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-muted-foreground transition-colors hover:text-foreground',
        isActive && 'text-primary'
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary mt-2"></div>
      )}
    </button>
  );
}

export default function ProposalsPage() {
  const [activeView, setActiveView] = useState<ActiveView>('proposals');
  const proposalStatuses: (ProposalStatus | 'all')[] = ['all', 'accepted', 'sent', 'draft', 'rejected'];
  const clientStatuses: (ClientStatus | 'all')[] = ['all', 'active', 'lead', 'inactive'];

  const getClientById = (id: string): Client | undefined => {
    return clients.find(c => c.id === id);
  }

  const renderProposalsTable = (status: ProposalStatus | 'all') => {
    const filteredProposals = status === 'all' ? proposals : proposals.filter(p => p.status === status);
    
    return (
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">
                  Created At
                </TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProposals.map((proposal) => {
                const client = getClientById(proposal.client.id);
                if (!client) return null;

                return (
                  <ClientOverviewDialog key={proposal.id} client={client}>
                    <TableRow className="cursor-pointer">
                      <TableCell>
                          <div className="font-bold">{client.companyName}</div>
                          <div className="font-mono text-xs text-muted-foreground">Proposal ID: {proposal.id}</div>
                          <div className="font-mono text-xs text-muted-foreground">Client ID: {client.id}</div>
                          <div className="text-sm text-muted-foreground">{client.contactName} - {client.contactEmail}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`capitalize ${proposalStatusStyles[proposal.status]}`} variant="outline">
                          {proposal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {proposal.createdAt}
                      </TableCell>
                      <TableCell className="text-right">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(proposal.amount)}</TableCell>
                    </TableRow>
                  </ClientOverviewDialog>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  const renderClientsTable = (status: ClientStatus | 'all') => {
    const filteredClients = status === 'all' ? clients : clients.filter(c => c.status === status);
    return (
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <ClientOverviewDialog key={client.id} client={client}>
                  <TableRow className="cursor-pointer">
                    <TableCell>
                        <div className="font-bold">{client.companyName}</div>
                        <div className="font-mono text-xs text-muted-foreground">Client ID: {client.id}</div>
                        <div className="text-sm text-muted-foreground">{client.contactName} - {client.contactEmail}</div>
                        <div className="text-sm text-muted-foreground hidden md:block">{client.address}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`capitalize ${clientStatusStyles[client.status]}`} variant="outline">
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {client.subscription ? (
                          <div>
                              <div className="font-bold">{client.subscription.planName}</div>
                              <div className="font-bold text-sm text-muted-foreground">
                                  {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(client.subscription.amount)}
                              </div>
                              <div className="text-sm text-muted-foreground">{client.subscription.liters.toLocaleString()} Liters</div>
                          </div>
                      ) : (
                          <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                </ClientOverviewDialog>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proposals &amp; Clients</h1>
        <Button asChild size="sm" className="h-8 gap-1">
          <Link href="/dashboard/proposals/new">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              New Proposal
            </span>
          </Link>
        </Button>
      </div>

      <div className="border-b">
        <nav className="-mb-px flex gap-4" aria-label="Tabs">
            <div className="relative">
                <NavLink
                    icon={<FileText />}
                    label="Proposals"
                    isActive={activeView === 'proposals'}
                    onClick={() => setActiveView('proposals')}
                />
            </div>
            <div className="relative">
                <NavLink
                    icon={<Users />}
                    label="Clients"
                    isActive={activeView === 'clients'}
                    onClick={() => setActiveView('clients')}
                />
            </div>
        </nav>
      </div>

      <div className="space-y-4">
          {activeView === 'proposals' && (
             <Tabs defaultValue="all">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>All Proposals</CardTitle>
                                <CardDescription>
                                    View, manage, and create sales proposals.
                                </CardDescription>
                            </div>
                            <TabsList>
                                {proposalStatuses.map(status => (
                                <TabsTrigger key={status} value={status} className="capitalize">{status}</TabsTrigger>
                                ))}
                            </TabsList>
                        </div>
                    </CardHeader>
                    {proposalStatuses.map(status => (
                        <TabsContent key={status} value={status}>
                            {renderProposalsTable(status)}
                        </TabsContent>
                    ))}
                </Card>
            </Tabs>
          )}
          {activeView === 'clients' && (
            <Tabs defaultValue="all">
                <Card>
                    <CardHeader>
                         <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Clients</CardTitle>
                                <CardDescription>
                                    Manage your clients and view their sales history.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <TabsList>
                                    {clientStatuses.map(status => (
                                    <TabsTrigger key={status} value={status} className="capitalize">{status}</TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>
                        </div>
                    </CardHeader>
                    {clientStatuses.map(status => (
                        <TabsContent key={status} value={status}>
                            {renderClientsTable(status)}
                        </TabsContent>
                    ))}
                </Card>
            </Tabs>
          )}
      </div>
    </div>
  );
}
