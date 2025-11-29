
'use client';

import {
  User,
  Building,
  Mail,
  Phone,
  Users,
  GlassWater,
  Briefcase,
  MapPin,
  PlusCircle,
  ChevronLeft,
  Map,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useClients } from '@/hooks/use-clients';
import type { Client } from '@/lib/definitions';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { GoogleMap } from '@/components/google-map';
import { waterStations } from '@/lib/water-stations';
import { useDebounce } from 'use-debounce';
import { useToast } from '@/hooks/use-toast';
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
  const { clients, isLoading: clientsLoading } = useClients();
  const searchParams = useSearchParams();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSelectionType, setClientSelectionType] = useState<'new' | 'existing' | null>(null);
  
  // States for new client form
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');

  // States for duplicate detection
  const [debouncedCompanyName] = useDebounce(companyName, 500);
  const [debouncedContactEmail] = useDebounce(contactEmail, 500);
  const [potentialDuplicate, setPotentialDuplicate] = useState<Client | null>(null);
  const { toast } = useToast();
  
  const isNewClient = clientSelectionType === 'new';

  const availableClients = useMemo(() => {
    // Only show clients with a 'pending' status, as active clients already have a subscription.
    return clients.filter(client => client.status === 'pending');
  }, [clients]);

  // Check for duplicates and auto-switch
  useEffect(() => {
    if (isNewClient && (debouncedCompanyName || debouncedContactEmail)) {
      const found = clients.find(c => 
        (debouncedCompanyName && c.companyName.toLowerCase() === debouncedCompanyName.toLowerCase()) ||
        (debouncedContactEmail && c.contactEmail.toLowerCase() === debouncedContactEmail.toLowerCase())
      );
      if (found) {
        toast({
          title: "Existing Client Found",
          description: `Switched to existing client record for ${found.companyName}.`,
        });
        setClientSelectionType('existing');
        setSelectedClientId(found.id);
      } else {
        setPotentialDuplicate(null);
      }
    } else {
      setPotentialDuplicate(null);
    }
  }, [debouncedCompanyName, debouncedContactEmail, clients, isNewClient, toast]);


  const selectedClient = useMemo(() => {
    if (!selectedClientId || selectedClientId === 'new') return null;
    const client = clients.find(c => c.id === selectedClientId); // Search all clients, not just available ones
    if(client) {
        setCompanyName(client.companyName);
        setContactName(client.contactName);
        setContactEmail(client.contactEmail);
        setContactPhone(client.contactPhone || '');
        setAddress(client.address);
    }
    return client;
  }, [clients, selectedClientId]);

  useEffect(() => {
    const clientIdFromQuery = searchParams.get('clientId');
    if (clientIdFromQuery) {
        setClientSelectionType('existing');
        setSelectedClientId(clientIdFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    if (clientSelectionType === 'existing' && selectedClient) {
        setCompanyName(selectedClient.companyName);
        setContactName(selectedClient.contactName);
        setContactEmail(selectedClient.contactEmail);
        setContactPhone(selectedClient.contactPhone || '');
        setAddress(selectedClient.address);
    } else if (clientSelectionType === 'new') {
        // Reset fields when switching to "new client"
        setSelectedClientId('');
        setCompanyName('');
        setContactName('');
        setContactEmail('');
        setContactPhone('');
        setAddress('');
    }
  }, [clientSelectionType, selectedClient]);

  const getNextStepLink = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (clientSelectionType === 'existing' && selectedClientId) {
        params.set('clientId', selectedClientId);
    }
    
    params.set('companyName', companyName);
    params.set('contactName', contactName);
    params.set('contactEmail', contactEmail);
    params.set('contactPhone', contactPhone);
    params.set('address', address);

    if (selectedClient?.clientType) {
        params.set('clientType', selectedClient.clientType);
    }
    
    const baseUrl = '/dashboard/proposals/new/about';

    return `${baseUrl}?${params.toString()}`;
  }
  
  const isNextDisabled = useMemo(() => {
    if (clientSelectionType === 'existing') {
        return !selectedClientId;
    }
    if (clientSelectionType === 'new') {
        const requiredFieldsEmpty = !companyName || !contactName || !contactEmail || !contactPhone || !address;
        return requiredFieldsEmpty || !!potentialDuplicate;
    }
    return true; // Disabled if no selection type is chosen
  }, [clientSelectionType, selectedClientId, companyName, contactName, contactEmail, contactPhone, address, potentialDuplicate]);
    
  const stationMarkers = waterStations.map(station => ({
    position: station.location,
    title: station.name,
    icon: '/water-drop.png'
  }));

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
            <div>
                <div className="flex items-center gap-2">
                    {clientSelectionType && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setClientSelectionType(null)}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <h1 className="text-3xl font-bold">Create a New Proposal</h1>
                </div>
                <p className="text-muted-foreground ml-10">
                    Step 1: Client Information
                </p>
            </div>
            {clientSelectionType && (
                 <Button asChild size="lg" disabled={isNextDisabled}>
                    <Link href={getNextStepLink()}>Next Step</Link>
                </Button>
            )}
        </div>

      <div className="relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 md:p-8">
            {!clientSelectionType && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }}>
                        <Card 
                            className="flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 h-full bg-gradient-to-br from-primary to-[#3ab7b1] text-primary-foreground"
                            onClick={() => setClientSelectionType('new')}
                        >
                            <PlusCircle className="h-12 w-12 text-primary-foreground mb-4" />
                            <CardTitle>Create New Client</CardTitle>
                            <CardDescription className="text-primary-foreground/80">Start a proposal for a brand new client.</CardDescription>
                        </Card>
                    </motion.div>
                     <motion.div whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }}>
                        <Card 
                            className="flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 h-full bg-gradient-to-br from-primary to-[#3ab7b1] text-primary-foreground"
                            onClick={() => setClientSelectionType('existing')}
                        >
                            <Users className="h-12 w-12 text-primary-foreground mb-4" />
                            <CardTitle>Use Existing Client</CardTitle>
                            <CardDescription className="text-primary-foreground/80">Select from your current list of clients.</CardDescription>
                        </Card>
                    </motion.div>
                </div>
            )}
            
            {clientSelectionType === 'existing' && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="client-select">Client</Label>
                        <Select onValueChange={setSelectedClientId} value={selectedClientId}>
                            <SelectTrigger id="client-select">
                                <SelectValue placeholder="Select an existing client" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableClients.length > 0 ? (
                                    availableClients.map(client => (
                                        <SelectItem key={client.id} value={client.id}>{client.companyName}</SelectItem>
                                    ))
                                ) : (
                                    <div className="p-4 text-sm text-muted-foreground text-center">No pending clients available.</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedClient && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Client Details</h3>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-3">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <div>
                                <p className="text-muted-foreground">Company</p>
                                <p className="font-medium">{selectedClient.companyName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-muted-foreground">Contact Person</p>
                                <p className="font-medium">{selectedClient.contactName}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-muted-foreground">Email</p>
                                <p className="font-medium">{selectedClient.contactEmail}</p>
                              </div>
                            </div>
                             <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-muted-foreground">Phone</p>
                                <p className="font-medium">{selectedClient.contactPhone}</p>
                              </div>
                            </div>
                             <div className="flex items-center gap-3 col-span-full">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-muted-foreground">Address</p>
                                <p className="font-medium">{selectedClient.address}</p>
                              </div>
                            </div>
                             <div className="flex items-center gap-3">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-muted-foreground">Client Type</p>
                                <p className="font-medium capitalize">{selectedClient.clientType === 'household' ? 'Family Plan' : selectedClient.clientType || 'N/A'}</p>
                              </div>
                            </div>
                         </div>
                      </div>
                    )}
                </div>
            )}
              
              {clientSelectionType === 'new' && (
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
              )}
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
    </div>
  );
}
