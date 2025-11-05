

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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo, useEffect } from 'react';
import { useClients } from '@/hooks/use-clients';
import type { Client } from '@/lib/definitions';

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
  const [selectedClientId, setSelectedClientId] = useState('');
  
  // States for new client form
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [clientType, setClientType] = useState<Client['clientType'] | ''>('');
  
  const isNewClient = selectedClientId === 'new';

  const selectedClient = useMemo(() => {
    if (!selectedClientId || selectedClientId === 'new') return null;
    const client = clients.find(c => c.id === selectedClientId);
    if(client) {
        setCompanyName(client.companyName);
        setContactName(client.contactName);
        setContactEmail(client.contactEmail);
        setContactPhone(client.contactPhone);
        setAddress(client.address);
        setClientType(client.clientType || '');
    }
    return client;
  }, [clients, selectedClientId]);

  useEffect(() => {
    if (selectedClientId !== 'new' && selectedClient) {
        setCompanyName(selectedClient.companyName);
        setContactName(selectedClient.contactName);
        setContactEmail(selectedClient.contactEmail);
        setContactPhone(selectedClient.contactPhone);
        setAddress(selectedClient.address);
        setClientType(selectedClient.clientType || '');
    } else if (isNewClient) {
        // Reset fields when switching to "new client"
        setCompanyName('');
        setContactName('');
        setContactEmail('');
        setContactPhone('');
        setAddress('');
        setClientType('');
    }
  }, [selectedClientId, selectedClient, isNewClient]);

  const getNextStepLink = () => {
    const params = new URLSearchParams();
    
    if (selectedClientId && selectedClientId !== 'new') {
        params.set('clientId', selectedClientId);
    }
    
    params.set('companyName', companyName);
    params.set('contactName', contactName);
    params.set('contactEmail', contactEmail);
    params.set('contactPhone', contactPhone);
    params.set('address', address);
    if (clientType) {
        params.set('clientType', clientType);
    }

    return `/dashboard/proposals/new/about?${params.toString()}`;
  }
  
  const isNextDisabled = !selectedClientId || (isNewClient && (!companyName || !contactName || !clientType || !contactEmail || !contactPhone || !address));

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold">Create a New Proposal</h1>
            <p className="text-muted-foreground">
                Step 1: Enter Client Information
            </p>
        </div>
        <Button asChild size="lg" disabled={isNextDisabled}>
          <Link href={getNextStepLink()}>Next Step</Link>
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 md:p-8 space-y-4">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="client-select">Client</Label>
                    <Select onValueChange={setSelectedClientId} value={selectedClientId}>
                        <SelectTrigger id="client-select">
                            <SelectValue placeholder="Select an existing client or create a new one" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new">Create a new client</SelectItem>
                            {clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>{client.companyName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              
              {isNewClient && (
                <>
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
                        <InputField
                          id="address"
                          label="Company Address"
                          icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                          placeholder="e.g., 123 Tech Lane, BGC, Taguig"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>
                   <div className="space-y-2">
                      <Label htmlFor="client-type">Client Type</Label>
                      <Select onValueChange={value => setClientType(value as Client['clientType'])} value={clientType}>
                          <SelectTrigger id="client-type">
                              <SelectValue placeholder="Select client type" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="household">Individual (Household)</SelectItem>
                              <SelectItem value="sme">SME</SelectItem>
                              <SelectItem value="commercial">Commercial</SelectItem>
                              <SelectItem value="corporate">Corporate</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                      </Select>
                    </div>
                </>
              )}

              {selectedClient && !isNewClient && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold">Client Details</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                       <div className="flex items-center gap-3">
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
                          <p className="font-medium capitalize">{selectedClient.clientType || 'N/A'}</p>
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>
          <div className="relative h-48 mt-8">
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FBG_Web_v2.png?alt=media&token=e944282b-6f8d-4cdd-8463-eeaf96746522"
              alt="background"
              layout="fill"
              objectFit="cover"
              objectPosition="bottom"
              className="rounded-b-lg"
            />
          </div>
        </div>
    </div>
  );
}

    
