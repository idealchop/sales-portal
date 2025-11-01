
'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from './ui/button';
import { Phone, Mail, MapPin, Building, Briefcase, FileText } from 'lucide-react';
import type { Client } from '@/lib/definitions';
import { ContractText, ContractSection } from '@/app/dashboard/proposals/new/contract/page';
import { Label } from './ui/label';
import { Input } from './ui/input';

const clientStatusStyles: { [key: string]: string } = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  lead: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
};

const planImages: { [key: string]: string } = {
  sme: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_SME.png?alt=media&token=e6beeb7b-3ed1-4e51-87cf-1b65b49041a1",
  commercial: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_Business.png?alt=media&token=b8536b3c-5199-460a-8612-003c99139d7c",
  corporate: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_Enterprise.png?alt=media&token=29e0d6a7-41f7-4511-a8b6-0369989421bd",
  enterprise: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Fwater_refill_Flow.png?alt=media&token=6b11f719-39e9-4ea4-b4a6-1bbe587bfa63",
};

const getPlanImage = (planId?: string) => {
    if (!planId) return planImages.sme;
    if (planId.includes('micro') || planId.includes('starter') || planId.includes('professional')) return planImages.sme;
    if (planId.includes('growth') || planId.includes('pro') || planId.includes('business')) return planImages.commercial;
    if (planId.includes('enterprise')) return planImages.corporate;
    return planImages.sme;
}

export function ClientOverviewDialog({
  children,
  client,
}: {
  children: React.ReactNode;
  client: Client;
}) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const planImage = getPlanImage(client.subscription?.planId);

  return (
    <Dialog>
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
                            <div className="flex items-center gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="font-semibold">{client.address}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Current Subscription</CardTitle>
                        </CardHeader>
                        {client.subscription ? (
                            <CardContent className="space-y-4">
                                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                                    <Image src={planImage} alt={client.subscription.planName} fill className="object-cover" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold">{client.subscription.planName}</h3>
                                    <p className="text-2xl font-bold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(client.subscription.amount)} / month</p>
                                    <p className="text-muted-foreground">{client.subscription.liters.toLocaleString()} Liters included</p>
                                </div>
                                <Button className="w-full">Upgrade Plan</Button>
                            </CardContent>
                        ) : (
                            <CardContent>
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No active subscription.</p>
                                    <Button className="mt-4">Create a Proposal</Button>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                 </div>
                
                 <Card>
                    <CardHeader>
                        <CardTitle>Client Location</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-video w-full overflow-hidden rounded-lg">
                        <iframe
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(client.address)}&output=embed`}
                        ></iframe>
                        </div>
                    </CardContent>
                </Card>
                 <Dialog>
                    <DialogTrigger asChild>
                         <Card className="cursor-pointer hover:bg-accent transition-colors">
                            <CardHeader className="flex-row items-center gap-4 space-y-0">
                                <FileText className="h-6 w-6 text-primary" />
                                <div>
                                    <CardTitle className="text-base">View Signed Contract</CardTitle>
                                    <CardDescription>Click to view the full agreement.</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Smart Refill™ Water Supply Subscription Agreement</DialogTitle>
                            <DialogDescription>
                                Between: River Tech Group, Inc. (“Provider”) and {client.companyName} (“Client”).
                            </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[70vh] pr-6">
                            <div className="space-y-6 py-4">
                                <ContractText />
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Signatures</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-4">
                                        <p className="font-semibold text-foreground">Client Representative (Subscriber)</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="name-preview">Name</Label>
                                                    <Input id="name-preview" placeholder="Full Name" value={client.contactName} readOnly />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="company-preview">Company</Label>
                                                    <Input id="company-preview" placeholder="Company Name" value={client.companyName} readOnly />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Date Signed</Label>
                                                    <Input placeholder="Date" value={today} readOnly />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Signature</Label>
                                                <div className="w-full h-[200px] border rounded-md bg-gray-50 flex items-center justify-center">
                                                    <p className="text-muted-foreground">Signature Placeholder</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
