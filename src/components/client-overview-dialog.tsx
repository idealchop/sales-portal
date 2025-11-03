

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
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from './ui/button';
import { Phone, Mail, MapPin, Building, Briefcase, FileText, Users, GlassWater, RefreshCcw, Package, CheckCircle, Sparkles, Upload, FileCheck, Eye } from 'lucide-react';
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
  view,
}: {
  children: React.ReactNode;
  client: Client;
  view: 'proposals' | 'clients';
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
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                                <div className='flex-1'>
                                    <p className="font-semibold">{client.address}</p>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <div className="aspect-video w-full overflow-hidden rounded-lg mt-2 cursor-pointer">
                                                <iframe
                                                    width="100%"
                                                    height="100%"
                                                    style={{ border: 0, pointerEvents: 'none' }}
                                                    loading="lazy"
                                                    allowFullScreen
                                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(client.address)}&output=embed&z=15`}
                                                ></iframe>
                                            </div>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-3xl h-[80vh]">
                                            <DialogHeader>
                                                <DialogTitle>Location: {client.companyName}</DialogTitle>
                                                <DialogDescription>{client.address}</DialogDescription>
                                            </DialogHeader>
                                            <div className="w-full h-full rounded-lg overflow-hidden">
                                                <iframe
                                                    width="100%"
                                                    height="100%"
                                                    style={{ border: 0 }}
                                                    loading="lazy"
                                                    allowFullScreen
                                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(client.address)}&output=embed&z=17`}
                                                ></iframe>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
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
                                            <p className="text-muted-foreground">Est. Bottles</p>
                                            <p className="font-semibold">~{Math.round(client.subscription.liters / 19)}</p>
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
                                <Button className="w-full" asChild>
                                  <Link href="/dashboard/proposals/new">Create New Proposal</Link>
                                </Button>
                            </CardContent>
                        ) : (
                            <CardContent>
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No active subscription.</p>
                                    <Button className="mt-4" asChild>
                                        <Link href="/dashboard/proposals/new">Create a Proposal</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                 </div>

                 {view === 'proposals' ? (
                     <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <div>
                                <CardTitle>Payment Confirmation</CardTitle>
                                <CardDescription>
                                    Upload the client’s payment confirmation to finalize the subscription.
                                </CardDescription>
                            </div>
                             <Button>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Confirmation
                            </Button>
                        </CardHeader>
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
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Client Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                                            <span className="text-muted-foreground">Client ID:</span>
                                            <span className="font-semibold font-mono">{client.id}</span>
                                        </div>
                                         <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                                            <span className="text-muted-foreground">Date Signed:</span>
                                            <span className="font-semibold">{today}</span>
                                        </div>
                                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                                            <span className="text-muted-foreground">Company:</span>
                                            <span className="font-semibold">{client.companyName}</span>
                                        </div>
                                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                                            <span className="text-muted-foreground">Contact:</span>
                                            <span className="font-semibold">{client.contactName}</span>
                                        </div>
                                        <div className="grid grid-cols-[100px_1fr] items-start gap-2 col-span-2">
                                            <span className="text-muted-foreground">Address:</span>
                                            <span className="font-semibold">{client.address}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {client.subscription ? (
                                     <Card>
                                        <CardHeader>
                                            <CardTitle>Subscription Summary</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <h3 className="font-semibold">{client.subscription.planName}</h3>
                                                    <p className="text-2xl font-bold">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(client.subscription.amount)} / month</p>
                                                </div>
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
                                                            <p className="text-muted-foreground">Est. Bottles</p>
                                                            <p className="font-semibold">~{Math.round(client.subscription.liters / 19)}</p>
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
                                            </div>
                                            <Separator />
                                            <div className="grid grid-cols-2 gap-6">
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
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <p className="text-muted-foreground">No subscription details available.</p>
                                )}
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
