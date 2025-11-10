'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Building,
  Mail,
  Phone,
  User,
  Globe,
  Info,
} from 'lucide-react';
import type { Client } from '@/lib/definitions';
import { Badge } from './ui/badge';

const statusStyles: { [key: string]: string } = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
};

export function ClientPopover({
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

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={undefined}
                alt={client.contactName}
              />
              <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(client.contactName)}</AvatarFallback>
            </Avatar>
            <div className="grid gap-1">
              <h3 className="font-semibold">{client.contactName}</h3>
              <p className="text-sm text-muted-foreground">
                Contact at {client.companyName}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Phone className="h-4 w-4" />
                  <span className="sr-only">Call</span>
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8">

                  <Mail className="h-4 w-4" />
                  <span className="sr-only">Message</span>
                </Button>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Details</h4>
            <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{client.companyName}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{client.contactName}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${client.contactEmail}`} className="hover:underline">
                        {client.contactEmail}
                    </a>
                </div>
                <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                     <Badge className={`capitalize ${statusStyles[client.status]}`} variant="outline">
                        {client.status}
                      </Badge>
                </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
