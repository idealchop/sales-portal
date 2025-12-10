

'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useSalesUsers } from '@/hooks/use-sales-users';
import { useAllProposals } from '@/hooks/use-all-proposals';
import { useCommissions } from '@/hooks/use-commissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TFooter } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Users, Trophy, Award, FileSignature, Target, CircleDollarSign, BarChart3, ArrowUp, ArrowDown, CalendarDays, BarChart as BarChartIcon, Phone, Mail, Eye, Search, Star, QrCode, Download, BookCopy, FileText, Check, X, Send, PlusCircle, Trash2, Loader, Calendar, File, Percent } from 'lucide-react';
import type { UserProfile, Proposal, Client, Commission } from '@/lib/definitions';
import { WithId } from '@/firebase';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval, differenceInMonths, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useClients } from '@/hooks/use-clients';
import { ClientOverviewDialog } from '@/components/client-overview-dialog';
import { useAllClients } from '@/hooks/use-all-clients';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';


const proposalStatusStyles: { [key: string]: string } = {
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  finalized: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
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

const ProposalsDialog = ({ rep, proposals, clientMap, salesUsers, currencyFormatter }: { rep: any, proposals: any[], clientMap: Map<string, Client>, salesUsers: any[], currencyFormatter: Intl.NumberFormat }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProposals = useMemo(() => {
        return proposals.filter(p => {
            const client = clientMap.get(p.clientId);
            if (!client) return false;

            const searchTerm = searchQuery.toLowerCase();
            const clientNameMatch = client.companyName.toLowerCase().includes(searchTerm);
            const clientIdMatch = client.id.toLowerCase().includes(searchTerm);

            return clientNameMatch || clientIdMatch;
        });
    }, [proposals, searchQuery, clientMap]);

    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Proposals by {rep.displayName}</DialogTitle>
                <DialogDescription>A list of all proposals created by this sales executive.</DialogDescription>
                <div className="relative pt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by client name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </DialogHeader>
            <ScrollArea className="h-[60vh]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProposals.length > 0 ? (
                            filteredProposals.map(p => {
                                const client = clientMap.get(p.clientId);
                                return (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">
                                            {client ? client.companyName : 'N/A'}
                                        </TableCell>
                                        <TableCell>{currencyFormatter.format(p.amount)}</TableCell>
                                        <TableCell>
                                            <Badge className={cn("capitalize", p.status && proposalStatusStyles[p.status])} variant="outline">{p.status}</Badge>
                                        </TableCell>
                                        <TableCell>{format(new Date(p.createdAt), 'PPP')}</TableCell>
                                        <TableCell className="text-right">
                                            {client && (
                                                <ClientOverviewDialog client={client} proposal={p} allUsers={salesUsers} view="clients">
                                                    <Button variant="ghost" size="sm">View Client</Button>
                                                </ClientOverviewDialog>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">No proposals found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </DialogContent>
    );
};

const TeamGoalsDialog = () => {
  const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
  const closerBonusTiers = [
    { target: 5, bonus: 1000, icon: <Star className="h-5 w-5 text-yellow-400" /> },
    { target: 10, bonus: 2500, icon: <Star className="h-5 w-5 text-yellow-400" /> },
    { target: 20, bonus: 5000, icon: <Trophy className="h-5 w-5 text-amber-500" /> },
    { target: 30, bonus: 10000, icon: <Trophy className="h-5 w-5 text-amber-500" /> },
    { target: 50, bonus: 15000, icon: <Award className="h-5 w-5 text-violet-500" /> },
  ];
  const individualCloserBonusTiers = [
    { target: 10, bonus: 500, icon: <Star className="h-5 w-5 text-yellow-400" /> },
    { target: 20, bonus: 1000, icon: <Star className="h-5 w-5 text-yellow-400" /> },
    { target: 50, bonus: 2500, icon: <Trophy className="h-5 w-5 text-amber-500" /> },
    { target: 75, bonus: 5000, icon: <Trophy className="h-5 w-5 text-amber-500" /> },
    { target: 100, bonus: 10000, icon: <Award className="h-5 w-5 text-violet-500" /> },
  ];
  const growthBonusTiers = [
    { target: 400000, bonus: '₱5,000', icon: <Star className="h-5 w-5 text-yellow-400" /> },
    { target: 800000, bonus: '₱10,000', icon: <Trophy className="h-5 w-5 text-amber-500" /> },
    { target: 1200000, bonus: '₱20,000 + Elite Partner Badge', icon: <Award className="h-5 w-5 text-violet-500" /> },
  ];
  const prepaymentProgressTiers = [
    { target: 3, reward: '₱1,000' },
    { target: 9, reward: '₱4,000' },
    { target: 15, reward: '₱10,000 Milestone Bonus' },
  ];

  return (
    <DialogContent className="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Team Goals & Bonuses</DialogTitle>
        <DialogDescription>
          An overview of the current incentives available for your sales team.
        </DialogDescription>
      </DialogHeader>
      <ScrollArea className="h-[70vh] pr-4">
        <div className="space-y-6 py-4">
          <Card>
            <CardHeader>
              <CardTitle>Corporate Closer Bonus</CardTitle>
              <CardDescription>Reward for closing corporate clients (SME, Commercial, Corporate, Enterprise). Claimed after clients complete their first paid month.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Target</TableHead><TableHead>Bonus</TableHead></TableRow></TableHeader>
                <TableBody>
                  {closerBonusTiers.map(tier => (
                    <TableRow key={tier.target}>
                      <TableCell className="font-medium flex items-center gap-2">{tier.icon} Close {tier.target} new clients</TableCell>
                      <TableCell className="font-bold text-primary">{currencyFormatter.format(tier.bonus)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Family Plan Closer Bonus</CardTitle>
              <CardDescription>Reward for bringing in household clients. Claimed after clients complete their first paid month.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Target</TableHead><TableHead>Bonus</TableHead></TableRow></TableHeader>
                <TableBody>
                  {individualCloserBonusTiers.map(tier => (
                    <TableRow key={tier.target}>
                      <TableCell className="font-medium flex items-center gap-2">{tier.icon} Close {tier.target} new household clients</TableCell>
                      <TableCell className="font-bold text-primary">{typeof tier.bonus === 'number' ? currencyFormatter.format(tier.bonus) : tier.bonus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quarterly Growth Bonus</CardTitle>
              <CardDescription>To reward expansion and total client base impact based on new recurring volume per quarter.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead>Bonus</TableHead></TableRow></TableHeader>
                <TableBody>
                  {growthBonusTiers.map(tier => (
                    <TableRow key={tier.target}>
                      <TableCell className="font-medium flex items-center gap-2">{tier.icon} Achieve {currencyFormatter.format(tier.target)}</TableCell>
                      <TableCell className="font-bold text-primary">{tier.bonus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle>Prepayment Power-Up Bonus</CardTitle>
              <CardDescription>Rewards for securing long-term financial commitments from clients.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                  <TableHeader><TableRow><TableHead>Milestone</TableHead><TableHead>Reward</TableHead></TableRow></TableHeader>
                  <TableBody>
                      {prepaymentProgressTiers.map(tier => (
                          <TableRow key={tier.target}>
                              <TableCell className="font-medium">Close {tier.target} prepaid contracts</TableCell>
                              <TableCell className="font-bold text-primary">{tier.reward}</TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </DialogContent>
  );
};

interface CommissionDetail {
    salesRepName?: string;
    clientName: string;
    saleAmount: number;
    commissionAmount: number;
    rate: number;
    sourceLocation?: string;
    description?: string;
    date: string;
    proposalId: string;
    clientId: string;
}

type MonthlyCommissionBreakdown = {
    month: string;
    total: number;
    details: CommissionDetail[];
};

const RecurringCommissionTimelineDialog = ({ commission }: { commission: CommissionDetail }) => {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const totalRecurringAmount = commission.commissionAmount * 12;
    const timeline = Array.from({ length: 12 }).map((_, i) => ({
        month: format(addMonths(new Date(commission.date), i), 'MMMM yyyy'),
        amount: commission.commissionAmount,
    }));

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Recurring Commission Timeline</DialogTitle>
                <DialogDescription>
                    12-month payout schedule for the sale to {commission.clientName}.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <Card>
                    <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Original Sale Amount</span>
                            <span className="font-semibold">{currencyFormatter.format(commission.saleAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Recurring Commission Rate</span>
                            <span className="font-semibold">{commission.rate.toFixed(1)}%</span>
                        </div>
                    </CardContent>
                </Card>
                <ScrollArea className="h-60">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Month</TableHead>
                                <TableHead className="text-right">Payout</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {timeline.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.month}</TableCell>
                                    <TableCell className="text-right font-medium">{currencyFormatter.format(item.amount)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
                <TFooter>
                    <TableRow>
                        <TableCell className="text-right font-bold text-base" colSpan={2}>Total Recurring Payout: {currencyFormatter.format(totalRecurringAmount)}</TableCell>
                    </TableRow>
                </TFooter>
            </div>
        </DialogContent>
    );
};


const CommissionCalculationDialog = ({ commission, isRecurring = false }: { commission: CommissionDetail, isRecurring?: boolean }) => {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const totalRecurringAmount = isRecurring ? commission.commissionAmount * 12 : 0;
    
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Commission Calculation</DialogTitle>
                <DialogDescription>
                    {isRecurring ? `Recurring commission for ${commission.clientName}` : `One-time commission for ${commission.clientName}`}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                 <div className="space-y-2 text-sm p-4 border rounded-lg">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Client Sale Amount</span>
                        <span className="font-semibold">{currencyFormatter.format(commission.saleAmount)}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">{isRecurring ? 'Recurring' : 'One-Time'} Commission Rate</span>
                        <span className="font-semibold">{commission.rate.toFixed(1)}%</span>
                    </div>
                </div>
                {isRecurring ? (
                     <div className="space-y-2 text-sm p-4 border rounded-lg bg-muted/50">
                        <div className="flex justify-between items-center font-semibold">
                            <span>Monthly Recurring Payout</span>
                            <span>{currencyFormatter.format(commission.commissionAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-lg pt-2 border-t mt-2">
                            <span>Total (12 Months)</span>
                            <span>{currencyFormatter.format(totalRecurringAmount)}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-between items-center font-bold text-lg p-4 bg-muted rounded-lg">
                        <span>Final Commission</span>
                        <span>{currencyFormatter.format(commission.commissionAmount)}</span>
                    </div>
                )}
            </div>
        </DialogContent>
    )
}

const ManagerCommissionsDialog = ({ directSalesCommissions, qrCampaignCommissions, teamOverrideCommissions, recurringCommissions, allClients, allProposals, allUsers }: { directSalesCommissions: MonthlyCommissionBreakdown[]; qrCampaignCommissions: MonthlyCommissionBreakdown[]; teamOverrideCommissions: MonthlyCommissionBreakdown[]; recurringCommissions: MonthlyCommissionBreakdown[], allClients: Client[], allProposals: Proposal[], allUsers: UserProfile[] }) => {
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const allMonths = useMemo(() => {
        const months = new Set([...directSalesCommissions.map(c => c.month), ...qrCampaignCommissions.map(c => c.month), ...teamOverrideCommissions.map(c => c.month), ...recurringCommissions.map(c => c.month)]);
        return Array.from(months).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [directSalesCommissions, qrCampaignCommissions, teamOverrideCommissions, recurringCommissions]);

    const [selectedMonth, setSelectedMonth] = useState<string>(allMonths[0] || '');

    useEffect(() => {
        if (!selectedMonth && allMonths.length > 0) {
            setSelectedMonth(allMonths[0]);
        }
    }, [allMonths, selectedMonth]);

    const selectedDirectSales = useMemo(() => directSalesCommissions.find(c => c.month === selectedMonth) || { total: 0, details: [] }, [directSalesCommissions, selectedMonth]);
    const selectedQrCampaigns = useMemo(() => qrCampaignCommissions.find(c => c.month === selectedMonth) || { total: 0, details: [] }, [qrCampaignCommissions, selectedMonth]);
    const selectedOverrides = useMemo(() => teamOverrideCommissions.find(c => c.month === selectedMonth) || { total: 0, details: [] }, [teamOverrideCommissions, selectedMonth]);
    const selectedRecurring = useMemo(() => recurringCommissions.find(c => c.month === selectedMonth) || { total: 0, details: [] }, [recurringCommissions, selectedMonth]);

    const totalForMonth = selectedDirectSales.total + selectedQrCampaigns.total + selectedOverrides.total + selectedRecurring.total;

    const CommissionTable = ({ title, commissions, commissionType }: { title: string, commissions: CommissionDetail[], commissionType: 'onetime' | 'override' | 'recurring' }) => {
        if (commissions.length === 0) return null;
        
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {commissions.map((detail, index) => {
                                return (
                                <TableRow key={index}>
                                    <TableCell>
                                        <p className="font-semibold">{detail.clientName}</p>
                                        <p className="text-xs text-muted-foreground">{detail.description}</p>
                                        {commissionType === 'override' && <p className="text-xs text-muted-foreground">From: {detail.salesRepName}</p>}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">{currencyFormatter.format(detail.commissionAmount)}</TableCell>
                                    <TableCell className="text-center">
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="outline" size="sm">View</Button>
                                        </DialogTrigger>
                                        <CommissionCalculationDialog commission={detail} isRecurring={commissionType === 'recurring'}/>
                                      </Dialog>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    }

    return (
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>My Commissions History</DialogTitle>
                <DialogDescription>
                    Your direct sales commissions and team override commissions.
                </DialogDescription>
                <div className="pt-4">
                    <Select onValueChange={setSelectedMonth} value={selectedMonth}>
                        <SelectTrigger className="w-full sm:w-[280px]">
                            <SelectValue placeholder="Select a month to view details" />
                        </SelectTrigger>
                        <SelectContent>
                            {allMonths.map(month => (
                                <SelectItem key={month} value={month}>
                                    {month}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </DialogHeader>
            <ScrollArea className="h-[60vh]">
                 <div className="space-y-6 pr-4">
                    <CommissionTable title="Direct Sales Commissions" commissions={selectedDirectSales.details} commissionType="onetime" />
                    <CommissionTable title="QR Campaign Commissions" commissions={selectedQrCampaigns.details} commissionType="onetime" />
                    <CommissionTable title="Recurring Commissions" commissions={selectedRecurring.details} commissionType="recurring" />
                    <CommissionTable title="Team Override Commissions" commissions={selectedOverrides.details} commissionType="override" />
                </div>
            </ScrollArea>
            {selectedMonth && (
                <DialogFooter className="border-t pt-4">
                    <div className="w-full flex justify-between items-center text-lg font-bold">
                        <span>Total for {selectedMonth}</span>
                        <span>{currencyFormatter.format(totalForMonth)}</span>
                    </div>
                </DialogFooter>
            )}
        </DialogContent>
    );
};

type QRCampaign = {
    id: string;
    name: string;
    url: string;
    qrUrl: string;
    createdAt: string;
}

function QrCodeDialog({ managerId }: { managerId: string; }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [newCampaignName, setNewCampaignName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const campaignsCollectionRef = useMemoFirebase(
      () => collection(firestore, 'sales', managerId, 'qr_campaigns'),
      [firestore, managerId]
    );
    const { data: campaigns, isLoading: campaignsLoading } = useCollection<QRCampaign>(campaignsCollectionRef);


    const handleCreateCampaign = async () => {
        if (!newCampaignName) {
            toast({ variant: "destructive", title: "Campaign Name Required", description: "Please enter a name for your campaign." });
            return;
        }

        setIsCreating(true);
        try {
            const baseUrl = `${window.location.origin}/proposal/new?managerId=${managerId}`;
            const urlWithParams = `${baseUrl}&campaignName=${encodeURIComponent(newCampaignName)}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(urlWithParams)}`;
            
            const newCampaign: Omit<QRCampaign, 'id' | 'createdAt'> = {
                name: newCampaignName,
                url: urlWithParams,
                qrUrl: qrUrl,
            };

            await addDoc(campaignsCollectionRef, {
                ...newCampaign,
                createdAt: serverTimestamp()
            });
            
            setNewCampaignName('');
            toast({ title: "Campaign Created!", description: `The QR code for "${newCampaignName}" is ready.` });
        } catch(error) {
            console.error("Failed to create campaign:", error);
            toast({ variant: "destructive", title: "Creation Failed", description: "Could not save the new campaign." });
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopy = (url: string) => {
        navigator.clipboard.writeText(url);
        toast({ title: "Link Copied!", description: "The shareable link has been copied." });
    };
    
    const handleDelete = async (campaignId: string) => {
        const campaignDocRef = doc(firestore, 'sales', managerId, 'qr_campaigns', campaignId);
        try {
            await deleteDoc(campaignDocRef);
            toast({ title: "Campaign Deleted", description: "The campaign has been removed." });
        } catch (error) {
            console.error("Failed to delete campaign:", error);
            toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete the campaign." });
        }
    }

    const handleDownload = async (qrUrl: string, name: string) => {
        try {
            const response = await fetch(qrUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `smart-refill-qr-${name.replace(/\s+/g, '-')}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            toast({ title: "Download Started", description: "Your QR code is downloading." });
        } catch (error) {
            console.error("Failed to download QR code:", error);
            toast({ variant: "destructive", title: "Download Failed", description: "Could not download the QR code." });
        }
    };

    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>QR Link Campaign Manager</DialogTitle>
                <DialogDescription>Create and manage unique QR codes for different events or materials. Sales from these links will be attributed to you.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Create New Campaign</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="campaign-name">Campaign Name</Label>
                            <div className="flex gap-2">
                                <Input id="campaign-name" value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} placeholder="e.g., SM Megamall Kiosk" />
                                <Button onClick={handleCreateCampaign} disabled={isCreating}>
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <h3 className="font-semibold">My Campaigns</h3>
                     {campaignsLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                     ) : (
                        <ScrollArea className="h-[40vh] pr-4">
                            {campaigns && campaigns.length > 0 ? (
                                <div className="space-y-4">
                                {campaigns.map((campaign) => (
                                    <Card key={campaign.id}>
                                        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                                            <div className="p-2 bg-white rounded-md border">
                                                <Image src={campaign.qrUrl} width={100} height={100} alt={`QR Code for ${campaign.name}`} />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <h4 className="font-semibold">{campaign.name}</h4>
                                                <div className="flex gap-2">
                                                    <Input value={campaign.url} readOnly className="h-8 text-xs" />
                                                    <Button size="sm" onClick={() => handleCopy(campaign.url)}>Copy</Button>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <Button size="sm" variant="outline" onClick={() => handleDownload(campaign.qrUrl, campaign.name)}>
                                                    <Download className="mr-2 h-4 w-4"/>
                                                    Download
                                                </Button>
                                                 <Button size="sm" variant="destructive" onClick={() => handleDelete(campaign.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4"/>
                                                    Delete
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                </div>
                            ) : (
                                <div className="text-center text-sm text-muted-foreground py-10">
                                    You haven't created any campaigns yet.
                                </div>
                            )}
                        </ScrollArea>
                     )}
                </div>
            </div>
        </DialogContent>
    )
}


export default function MyTeamPage() {
  const { user, isManager } = useUser();
  const { salesUsers, isLoading: usersLoading } = useSalesUsers();
  const { proposals, isLoading: proposalsLoading } = useAllProposals();
  const { clients, isLoading: clientsLoading } = useAllClients();
  const { allPayouts, isLoading: commissionsLoading } = useCommissions();
  const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
  const [proposalsByRepPeriod, setProposalsByRepPeriod] = useState<string>('all');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [qrCampaignSearch, setQrCampaignSearch] = useState('');
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);


  const myTeam = useMemo(() => {
    if (!user || !isManager || usersLoading) return [];

    const managerTeamName = `${user.location} (${user.displayName})`;

    return salesUsers.filter(
      (salesUser) => salesUser.role === 'sales' && salesUser.team === managerTeamName
    );
  }, [user, isManager, salesUsers, usersLoading]);

  const teamPerformance = useMemo(() => {
    if (proposalsLoading || myTeam.length === 0) return { leaderboard: [], kpis: {}, availableMonths: [], proposalsByRep: [], teamProposals: [] };
    
    const teamMemberIds = new Set(myTeam.map(m => m.id));
    const teamProposals = proposals.filter(p => teamMemberIds.has(p.userId));

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(lastMonthStart);

    const getValidDate = (timestamp: string | number | undefined | Date) => {
        if (!timestamp) return null;
        try {
            const d = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
            return isNaN(d.getTime()) ? null : d;
        } catch {
            return null;
        }
    }

    const leaderboardData = myTeam.map((member) => {
      const userProposals = teamProposals.filter((p) => p.userId === member.id);
      const acceptedProposals = userProposals.filter((p) => p.status === 'accepted');
      const sentProposals = userProposals.filter((p) => ['sent', 'accepted', 'rejected', 'finalized'].includes(p.status));
      const totalRevenue = acceptedProposals.reduce((sum, p) => sum + p.amount, 0);
      const winRate = sentProposals.length > 0 ? (acceptedProposals.length / sentProposals.length) * 100 : 0;
      const avgSale = acceptedProposals.length > 0 ? totalRevenue / acceptedProposals.length : 0;

      return {
        ...member,
        proposalsWon: acceptedProposals.length,
        totalRevenue,
        winRate,
        avgSale,
        proposals: userProposals,
      };
    });

    const sentProposalsAllTime = teamProposals.filter(p => ['sent', 'accepted', 'rejected', 'finalized'].includes(p.status));
    const acceptedProposalsAllTime = teamProposals.filter(p => p.status === 'accepted');

    const totalProposalsSent = sentProposalsAllTime.length;
    const teamWinRate = totalProposalsSent > 0 ? (acceptedProposalsAllTime.length / totalProposalsSent) * 100 : 0;
    const totalRevenue = acceptedProposalsAllTime.reduce((sum,p) => sum + p.amount, 0);
    const qrCampaignSales = proposals.filter(p => p.userId === user?.id && p.sourceLocation && p.status === 'accepted').length;

    const sentThisMonth = sentProposalsAllTime.filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: currentMonthStart, end: now }));
    const sentLastMonth = sentProposalsAllTime.filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: lastMonthStart, end: lastMonthEnd }));
    const proposalsSentChange = sentLastMonth.length > 0 ? ((sentThisMonth.length - sentLastMonth.length) / sentLastMonth.length) * 100 : sentThisMonth.length > 0 ? 100 : 0;
    
    const acceptedThisMonth = acceptedProposalsAllTime.filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: currentMonthStart, end: now }));
    const acceptedLastMonth = acceptedProposalsAllTime.filter(p => getValidDate(p.createdAt) && isWithinInterval(getValidDate(p.createdAt)!, { start: lastMonthStart, end: lastMonthEnd }));

    const winRateThisMonth = sentThisMonth.length > 0 ? (acceptedThisMonth.length / sentThisMonth.length) * 100 : 0;
    const winRateLastMonth = sentLastMonth.length > 0 ? (acceptedLastMonth.length / sentLastMonth.length) * 100 : 0;
    const winRateChange = winRateLastMonth > 0 ? ((winRateThisMonth - winRateLastMonth) / winRateLastMonth) * 100 : winRateThisMonth > 0 ? 100 : 0;
    
    const revenueThisMonth = acceptedThisMonth.reduce((sum, p) => sum + p.amount, 0);
    const revenueLastMonth = acceptedLastMonth.reduce((sum, p) => sum + p.amount, 0);
    const totalRevenueChange = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : revenueThisMonth > 0 ? 100 : 0;
    
    const availableMonths = Array.from(new Set(teamProposals.map(p => p.createdAt ? format(new Date(p.createdAt), 'MMMM yyyy') : null).filter(Boolean) as string[]))
        .sort((a,b) => new Date(b).getTime() - new Date(a).getTime());

    const filteredRepProposals = proposalsByRepPeriod === 'all'
        ? teamProposals
        : teamProposals.filter(p => {
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
        const user = myTeam.find(u => u.id === userId);
        return {
            userId: userId,
            name: user?.displayName || 'Unknown',
            proposals: count
        };
    }).sort((a, b) => b.proposals - a.proposals);
    
    const filteredLeaderboard = leaderboardData.filter(rep => rep.displayName.toLowerCase().includes(leaderboardSearch.toLowerCase()));

    const proposalStatusCounts = teamProposals.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);


    return {
        leaderboard: filteredLeaderboard.sort((a, b) => b.totalRevenue - a.totalRevenue),
        kpis: {
            totalProposalsSent,
            teamWinRate,
            totalRevenue,
            proposalsSentChange,
            winRateChange,
            totalRevenueChange,
            proposalStatusCounts,
            qrCampaignSales,
        },
        availableMonths,
        proposalsByRep,
        teamProposals,
    };
  }, [proposals, myTeam, proposalsLoading, proposalsByRepPeriod, leaderboardSearch, user]);
  
  const proposalMap = useMemo(() => new Map(proposals.map(p => [p.id, p])), [proposals]);

 const commissionDetails = useMemo(() => {
    if (commissionsLoading || proposalsLoading || clientsLoading || !isManager || !user) {
        return { directSales: [], qrCampaigns: [], teamOverrides: [], recurring: [] };
    }

    const directSalesByMonth: Record<string, MonthlyCommissionBreakdown> = {};
    const qrCampaignsByMonth: Record<string, MonthlyCommissionBreakdown> = {};
    const overridesByMonth: Record<string, MonthlyCommissionBreakdown> = {};
    const recurringByMonth: Record<string, MonthlyCommissionBreakdown> = {};
    
    const teamMemberIds = new Set(myTeam.map(m => m.id));
    const userMap = new Map(salesUsers.map(u => [u.id, u]));

    allPayouts.forEach(payout => {
        payout.commissions.forEach(comm => {
            if (!comm.createdAt) return;
            const monthKey = format(startOfMonth(new Date(comm.createdAt)), 'MMMM yyyy');
            const proposal = proposalMap.get(comm.proposalId);
            if (!proposal) return;

            const client = clientMap.get(proposal.clientId);
            if (!client) return;
            
            const detail: CommissionDetail = {
                salesRepName: userMap.get(proposal.userId)?.displayName || 'N/A',
                clientName: client.companyName || 'N/A',
                saleAmount: proposal.amount,
                commissionAmount: comm.amount,
                rate: proposal.amount > 0 ? (comm.amount / proposal.amount) * 100 : 0, 
                sourceLocation: proposal.sourceLocation,
                description: comm.description,
                date: comm.createdAt,
                proposalId: proposal.id,
                clientId: client.id,
            };
            
            const isManagerCommission = comm.userId === user.id;
            
            const isDirectSale = !comm.description?.includes('Override') && !comm.description?.includes('QR') && !comm.description?.includes('Recurring');
            const isQR = comm.description?.includes('QR') && !comm.description?.includes('Recurring');

            if (isManagerCommission) {
                if (comm.description?.includes('Recurring')) {
                    if (!recurringByMonth[monthKey]) recurringByMonth[monthKey] = { month: monthKey, total: 0, details: [] };
                    recurringByMonth[monthKey].details.push(detail);
                    recurringByMonth[monthKey].total += comm.amount;
                } else if (comm.description?.includes('Override')) {
                    if (teamMemberIds.has(proposal.userId)) {
                        if (!overridesByMonth[monthKey]) overridesByMonth[monthKey] = { month: monthKey, total: 0, details: [] };
                        overridesByMonth[monthKey].details.push(detail);
                        overridesByMonth[monthKey].total += comm.amount;
                    }
                } else if (isQR) {
                     if (!qrCampaignsByMonth[monthKey]) qrCampaignsByMonth[monthKey] = { month: monthKey, total: 0, details: [] };
                    qrCampaignsByMonth[monthKey].details.push(detail);
                    qrCampaignsByMonth[monthKey].total += comm.amount;
                } else if (isDirectSale) {
                    if (!directSalesByMonth[monthKey]) directSalesByMonth[monthKey] = { month: monthKey, total: 0, details: [] };
                    directSalesByMonth[monthKey].details.push(detail);
                    directSalesByMonth[monthKey].total += comm.amount;
                }
            }
        });
    });
    
    return {
        directSales: Object.values(directSalesByMonth),
        qrCampaigns: Object.values(qrCampaignsByMonth),
        teamOverrides: Object.values(overridesByMonth),
        recurring: Object.values(recurringByMonth),
    };
}, [allPayouts, commissionsLoading, proposals, clients, myTeam, salesUsers, isManager, user, proposalMap, clientMap]);


 const qrCampaignClients = useMemo(() => {
    if (!user || !isManager || proposalsLoading || clientsLoading) return [];
    
    return proposals
      .filter(p => p.userId === user.id && p.sourceLocation && p.status === 'accepted')
      .map(p => {
        const client = clientMap.get(p.clientId);
        return {
          proposal: p,
          client: client,
        };
      })
      .filter(item => {
        if (!item.client) return false;
        const searchTerm = qrCampaignSearch.toLowerCase();
        return item.client.companyName.toLowerCase().includes(searchTerm) ||
               (item.proposal.sourceLocation && item.proposal.sourceLocation.toLowerCase().includes(searchTerm));
      });
  }, [user, isManager, proposals, clients, proposalsLoading, clientsLoading, clientMap, qrCampaignSearch]);


  const isLoading = usersLoading || proposalsLoading || clientsLoading || commissionsLoading;

  if (isLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isManager) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>This page is only available to Sales Managers.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  const currentMonth = format(new Date(), 'MMMM yyyy');
  const totalCurrentMonthCommission = (allPayouts.find(p => p.month === currentMonth)?.totalAmount || 0);

  return (
    <div className="space-y-6">
       <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-2xl font-bold">My Team</h1>
                <p className="text-muted-foreground">Monitor the performance of your sales executives.</p>
            </div>
            <div className="flex items-center gap-2">
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button>
                            <QrCode className="mr-2 h-4 w-4" />
                            Manage QR Campaigns
                        </Button>
                    </DialogTrigger>
                    {user && <QrCodeDialog managerId={user.id} />}
                </Dialog>
                <Button asChild>
                    <Link href="/dashboard/proposals/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Proposal
                    </Link>
                </Button>
            </div>
        </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-r from-primary to-[#3ab7b1] text-primary-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Proposals Sent</CardTitle>
                    <FileSignature className="h-4 w-4 text-primary-foreground/70" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{teamPerformance.kpis.totalProposalsSent || 0}</div>
                    <p className={cn("text-xs text-primary-foreground/80 flex items-center", (teamPerformance.kpis.proposalsSentChange || 0) >= 0 ? "" : "text-red-300")}>
                        {(teamPerformance.kpis.proposalsSentChange || 0) >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        {(teamPerformance.kpis.proposalsSentChange || 0).toFixed(1)}% from last month
                    </p>
                </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-primary to-[#3ab7b1] text-primary-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Team Win Rate</CardTitle>
                    <Target className="h-4 w-4 text-primary-foreground/70" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{(teamPerformance.kpis.teamWinRate || 0).toFixed(1)}%</div>
                     <p className={cn("text-xs text-primary-foreground/80 flex items-center", (teamPerformance.kpis.winRateChange || 0) >= 0 ? "" : "text-red-300")}>
                        {(teamPerformance.kpis.winRateChange || 0) >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        {(teamPerformance.kpis.winRateChange || 0).toFixed(1)}% from last month
                    </p>
                </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-primary to-[#3ab7b1] text-primary-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue Generated</CardTitle>
                    <CircleDollarSign className="h-4 w-4 text-primary-foreground/70" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{currencyFormatter.format(teamPerformance.kpis.totalRevenue || 0)}</div>
                    <p className={cn("text-xs text-primary-foreground/80 flex items-center", (teamPerformance.kpis.totalRevenueChange || 0) >= 0 ? "" : "text-red-300")}>
                        {(teamPerformance.kpis.totalRevenueChange || 0) >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        {(teamPerformance.kpis.totalRevenueChange || 0).toFixed(1)}% from last month
                    </p>
                </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-primary to-[#3ab7b1] text-primary-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">QR Campaign Sales</CardTitle>
                    <QrCode className="h-4 w-4 text-primary-foreground/70" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{teamPerformance.kpis.qrCampaignSales || 0}</div>
                     <p className="text-xs text-primary-foreground/80">Total sales from all campaigns</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 flex flex-col">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                                <BarChartIcon className="h-5 w-5" />
                                Proposals by Team Member
                            </CardTitle>
                            <CardDescription>Total proposals created by each executive.</CardDescription>
                        </div>
                        <Select value={proposalsByRepPeriod} onValueChange={setProposalsByRepPeriod}>
                            <SelectTrigger className="w-full sm:w-auto sm:max-w-xs">
                                <SelectValue placeholder="Select a period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                {teamPerformance.availableMonths.map(month => <SelectItem key={month} value={month}></SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-6">
                    <div className="flex-1 pr-6 min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={teamPerformance.proposalsByRep} margin={{ top: 20, right: 0, left: 0, bottom: 20 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="userId" 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tick={<CustomXAxisTick salesUsers={myTeam} />}
                                    interval={0}
                                />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                    contentStyle={{ 
                                        backgroundColor: 'hsl(var(--background))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: 'var(--radius)'
                                    }}
                                    labelFormatter={(value) => {
                                        const user = myTeam.find(u => u.id === value);
                                        return user ? user.displayName : 'Unknown';
                                    }}
                                />
                                <Bar dataKey="proposals" fill="hsl(var(--primary))" radius={4} barSize={20} label={<CustomBarLabel />} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                     <div className="border-t pt-4">
                        <h3 className="font-semibold text-sm mb-2">Team Proposal Funnel</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex justify-between items-center p-3 bg-muted rounded-lg"><span className="flex items-center gap-1.5"><FileText className="text-muted-foreground"/>Drafts</span> <span className="font-semibold">{teamPerformance.kpis.proposalStatusCounts?.draft || 0}</span></div>
                            <div className="flex justify-between items-center p-3 bg-muted rounded-lg"><span className="flex items-center gap-1.5"><Send className="text-blue-500"/>Sent</span> <span className="font-semibold">{teamPerformance.kpis.proposalStatusCounts?.sent || 0}</span></div>
                            <div className="flex justify-between items-center p-3 bg-muted rounded-lg"><span className="flex items-center gap-1.5"><Check className="text-green-500"/>Accepted</span> <span className="font-semibold">{teamPerformance.kpis.proposalStatusCounts?.accepted || 0}</span></div>
                            <div className="flex justify-between items-center p-3 bg-muted rounded-lg"><span className="flex items-center gap-1.5"><X className="text-red-500"/>Rejected</span> <span className="font-semibold">{teamPerformance.kpis.proposalStatusCounts?.rejected || 0}</span></div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
                 <Dialog>
                    <DialogTrigger asChild>
                        <Card className="cursor-pointer hover:border-primary transition-colors">
                            <CardHeader>
                                <CardTitle>My Commissions</CardTitle>
                                <CardDescription>Your direct sales and team override commissions.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center text-center">
                                <div className='flex items-center justify-center rounded-full bg-primary/10 h-24 w-24 mb-4'>
                                    <CircleDollarSign className='h-12 w-12 text-primary'/>
                                </div>
                                <p className="text-4xl font-bold">{currencyFormatter.format(totalCurrentMonthCommission)}</p>
                                <p className="text-sm text-muted-foreground">This Month</p>
                            </CardContent>
                        </Card>
                    </DialogTrigger>
                    <ManagerCommissionsDialog directSalesCommissions={commissionDetails.directSales} qrCampaignCommissions={commissionDetails.qrCampaigns} teamOverrideCommissions={commissionDetails.teamOverrides} recurringCommissions={commissionDetails.recurring} allClients={clients} allProposals={proposals} allUsers={salesUsers} />
                </Dialog>
                <Dialog>
                    <DialogTrigger asChild>
                        <Card className="cursor-pointer hover:border-primary transition-colors">
                            <CardHeader>
                                <CardTitle>Team Goals &amp; Bonuses</CardTitle>
                                <CardDescription>Click to view current team incentives.</CardDescription>
                            </CardHeader>
                        </Card>
                    </DialogTrigger>
                    <TeamGoalsDialog />
                </Dialog>
                <Card className="overflow-hidden cursor-pointer hover:border-primary transition-colors">
                  <Link href="/dashboard/materials">
                      <div className="relative aspect-video w-full">
                        <Image
                            src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Fwater_refill_Flow.png?alt=media&token=6b11f719-39e9-4ea4-b4a6-1bbe587bfa63"
                            alt="Sales Materials Preview"
                            fill
                            className="object-cover"
                          />
                      </div>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookCopy/> Sales Materials</CardTitle>
                        <CardDescription>Your toolkit for success. Find presentations, brochures, and other assets.</CardDescription>
                      </CardHeader>
                  </Link>
                </Card>
            </div>
        </div>


      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className='flex-1'>
                  <CardTitle>Team Leaderboard</CardTitle>
                  <CardDescription>Performance ranking of your team members.</CardDescription>
              </div>
              <div className="relative w-full sm:w-auto sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Search by name..."
                      value={leaderboardSearch}
                      onChange={(e) => setLeaderboardSearch(e.target.value)}
                      className="pl-9"
                  />
              </div>
            </div>
        </CardHeader>
        <CardContent>
           <div className="md:hidden space-y-4">
             {teamPerformance.leaderboard && teamPerformance.leaderboard.length > 0 ? (
                teamPerformance.leaderboard.map((rep, index) => {
                    const rank = index + 1;
                    return (
                        <Card key={rep.id} className="p-4">
                          <div className="flex items-start gap-4">
                              <div className="font-bold text-lg w-8 text-center pt-1">
                                  {rank === 1 ? <Trophy className="w-6 h-6 text-yellow-400 mx-auto" /> :
                                  rank === 2 ? <Award className="w-6 h-6 text-gray-400 mx-auto" /> :
                                  rank === 3 ? <Award className="w-6 h-6 text-orange-400 mx-auto" /> :
                                  rank}
                              </div>
                              <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-3">
                                      <Avatar>
                                          <AvatarImage src={rep.photoURL} />
                                          <AvatarFallback>{rep.displayName?.[0]}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                          <p className="font-semibold">{rep.displayName}</p>
                                          <p className="text-sm text-muted-foreground">{rep.email}</p>
                                      </div>
                                  </div>
                                  <div className="border-t pt-3 space-y-2 text-sm">
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">Proposals Won:</span>
                                          <span className="font-semibold">{rep.proposalsWon}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">Win Rate:</span>
                                          <span className="font-semibold">{rep.winRate.toFixed(1)}%</span>
                                      </div>
                                      <div className="flex justify-between items-baseline">
                                          <span className="text-muted-foreground">Total Revenue:</span>
                                          <span className="font-bold text-primary text-base">{currencyFormatter.format(rep.totalRevenue)}</span>
                                      </div>
                                  </div>
                              </div>
                              <Dialog>
                                  <DialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="self-start">
                                          <Eye className="h-4 w-4" />
                                      </Button>
                                  </DialogTrigger>
                                  <ProposalsDialog rep={rep} proposals={rep.proposals} clientMap={clientMap} salesUsers={salesUsers} currencyFormatter={currencyFormatter} />
                              </Dialog>
                          </div>
                      </Card>
                    )
                })
             ) : (
                <div className="text-center py-10 text-muted-foreground">No sales executives found on your team yet.</div>
             )}
          </div>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Sales Executive</TableHead>
                  <TableHead>Proposals Won</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamPerformance.leaderboard && teamPerformance.leaderboard.length > 0 ? (
                  teamPerformance.leaderboard.map((rep, index) => {
                    const rank = index + 1;
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
                                      <div className="space-y-2 text-sm border-t pt-4">
                                          <div className="flex items-center gap-2">
                                              <Phone className="h-4 w-4 text-muted-foreground" />
                                              <span>{rep.phone || 'N/A'}</span>
                                          </div>
                                           <div className="flex items-center gap-2">
                                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                              <span>{rep.birthday ? format(new Date(rep.birthday), 'PPP') : 'N/A'}</span>
                                          </div>
                                      </div>
                                      <div className="space-y-3 border-t pt-4">
                                           <h4 className="font-semibold text-sm">Performance Summary</h4>
                                          <div className="flex justify-between items-center text-sm">
                                              <span className="text-muted-foreground">Total Revenue</span>
                                              <span className="font-semibold">{currencyFormatter.format(rep.totalRevenue)}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-sm">
                                              <span className="text-muted-foreground">Proposals Won</span>
                                              <span className="font-semibold">{rep.proposalsWon}</span>
                                          </div>
                                           <div className="flex justify-between items-center text-sm">
                                              <span className="text-muted-foreground">Average Sale</span>
                                              <span className="font-semibold">{currencyFormatter.format(rep.avgSale)}</span>
                                          </div>
                                      </div>
                                  </div>
                              </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>{rep.proposalsWon}</TableCell>
                        <TableCell>{rep.winRate.toFixed(1)}%</TableCell>
                        <TableCell className="text-right font-semibold">{currencyFormatter.format(rep.totalRevenue)}</TableCell>
                         <TableCell className="text-center">
                          <Dialog>
                              <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                      <Eye className="mr-2 h-4 w-4" /> View
                                  </Button>
                              </DialogTrigger>
                              <ProposalsDialog rep={rep} proposals={rep.proposals} clientMap={clientMap} salesUsers={salesUsers} currencyFormatter={currencyFormatter} />
                         </Dialog>
                         </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No sales executives found on your team yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className='flex-1'>
              <CardTitle>QR Campaign Client Tracker</CardTitle>
              <CardDescription>Clients who have signed up through your QR campaigns.</CardDescription>
            </div>
            <div className="relative w-full sm:w-auto sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client or campaign..."
                value={qrCampaignSearch}
                onChange={(e) => setQrCampaignSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Campaign Name</TableHead>
                <TableHead className="text-right">Contract Amount</TableHead>
                <TableHead className="text-right">Date Signed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qrCampaignClients.length > 0 ? (
                qrCampaignClients.map(({ proposal, client }) => (
                  <ClientOverviewDialog key={proposal.id} client={client!} proposal={proposal} allUsers={salesUsers} view="clients">
                    <TableRow className="cursor-pointer">
                      <TableCell className="font-medium">{client!.companyName}</TableCell>
                      <TableCell>{proposal.sourceLocation}</TableCell>
                      <TableCell className="text-right">{currencyFormatter.format(proposal.amount)}</TableCell>
                      <TableCell className="text-right">{format(new Date(proposal.createdAt), 'PPP')}</TableCell>
                    </TableRow>
                  </ClientOverviewDialog>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No clients have signed up via QR campaigns yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
