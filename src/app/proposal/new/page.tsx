
'use client';

import {
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Map,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useMemo, useEffect } from 'react';
import type { Client } from '@/lib/definitions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { GoogleMap } from '@/components/google-map';
import { useSearchParams } from 'next/navigation';


function InputField({
  id,
  label,
  icon,
  ...props
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          {icon}
        </div>
        <Input id={id} className="pl-10" {...props} />
      </div>
    </div>
  );
}


export default function NewProposalPage() {
  const searchParams = useSearchParams();
  
  // Directly set to new client flow
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');

  const getNextStepLink = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    params.set('companyName', companyName);
    params.set('contactName', contactName);
    params.set('contactEmail', contactEmail);
    params.set('contactPhone', contactPhone);
    params.set('address', address);
    
    const baseUrl = '/proposal/new/about';

    return `${baseUrl}?${params.toString()}`;
  }
  
  const isNextDisabled = useMemo(() => {
    return !companyName || !contactName || !contactEmail || !contactPhone || !address;
  }, [companyName, contactName, contactEmail, contactPhone, address]);
    

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-24 sm:pb-0">
        <div className="flex items-center justify-between">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold">Get Your Smart Refill Proposal</h1>
                </div>
                <p className="text-muted-foreground">
                    Step 1: Tell us about your business
                </p>
            </div>
             <div className="hidden sm:block">
                <Button asChild size="lg" disabled={isNextDisabled}>
                    <Link href={getNextStepLink()}>Next Step</Link>
                </Button>
            </div>
        </div>

      <div className="relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 md:p-8">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  id="company-name"
                  label="Company Name"
                  icon={<Building className="h-4 w-4 text-muted-foreground" />}
                  placeholder="e.g., Innovate Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                <InputField
                  id="contact-name"
                  label="Contact Person"
                  icon={<User className="h-4 w-4 text-muted-foreground" />}
                  placeholder="e.g., John Doe"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  id="email"
                  label="Email Address"
                  type="email"
                  icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                  placeholder="e.g., john.doe@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
                <InputField
                  id="phone"
                  label="Phone Number"
                  type="tel"
                  icon={<Phone className="h-4 w-4 text-muted-foreground" />}
                  placeholder="e.g., (0917) 123 4567"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
               <div className="space-y-2">
                    <Label htmlFor="address">Company Address</Label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Input
                            id="address"
                            placeholder="e.g., 123 Tech Lane, BGC, Taguig"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="pl-10 pr-10"
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                             <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Map className="h-5 w-5 text-primary" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
                                    <DialogHeader>
                                        <DialogTitle>Locate Address</DialogTitle>
                                        <DialogDescription>
                                            Enter an address to search, or drag the pin to the exact location.
                                        </DialogDescription>
                                    </DialogHeader>
                                     <InputField
                                        id="address-search"
                                        label="Search Address"
                                        icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                                        placeholder="Type to search..."
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                    />
                                    <div className="h-full w-full rounded-md overflow-hidden flex-1">
                                        <GoogleMap address={address} onAddressChange={setAddress} />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </div>
          </div>
          <div className="relative aspect-[32/9] mt-6">
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FBG_Web_v2.png?alt=media&token=e944282b-6f8d-4cdd-8463-eeaf96746522"
              alt="background"
              fill
              className="object-cover object-bottom rounded-b-lg"
            />
          </div>
        </div>

        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-10">
            <Button asChild size="lg" disabled={isNextDisabled} className="w-full">
                <Link href={getNextStepLink()}>Next Step</Link>
            </Button>
        </div>
    </div>
  );
}
