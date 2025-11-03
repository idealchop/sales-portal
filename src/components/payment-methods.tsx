
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Banknote } from 'lucide-react';
import Link from 'next/link';

const paymentOptions = [
  {
    name: 'Bank Transfer',
    description: 'BPI, BDO, UnionBank',
    logo: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FPayments%2Fwaterstations_unionbank.png?alt=media&token=e5428cad-1392-456e-a2fb-24026e848015',
    qrCode: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FPayments%2Fwaterstations_unionbank.png?alt=media&token=e5428cad-1392-456e-a2fb-24026e848015',
    type: 'dialog',
  },
  {
    name: 'GCash',
    description: 'Pay with GCash',
    logo: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FPayments%2Fwaterstations_gcash.png?alt=media&token=3dbf2d18-cd4a-4ab1-a0e2-3b9952c42412',
    qrCode: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FPayments%2Fwaterstations_gcash.png?alt=media&token=3dbf2d18-cd4a-4ab1-a0e2-3b9952c42412',
    type: 'dialog',
  },
  {
    name: 'Maya',
    description: 'Pay with Maya',
    logo: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FPayments%2Fwaterstations_paymaya.png?alt=media&token=d8572000-937b-40d7-999a-108b5017ab02',
    qrCode: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FPayments%2Fwaterstations_paymaya.png?alt=media&token=d8572000-937b-40d7-999a-108b5017ab02',
    type: 'dialog',
  },
  {
    name: 'Debit/Credit Card',
    description: 'Visa, Mastercard, AMEX',
    logo: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FPayments%2Fwaterstations_cardpayments.png?alt=media&token=78ffcb13-8647-42f2-b3b4-95512d468b62',
    type: 'link',
    href: '#',
  },
];

export function PaymentMethods() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accepted Payment Methods</CardTitle>
        <CardDescription>
          Choose your preferred payment method.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {paymentOptions.map((method) => {
          if (method.type === 'dialog') {
            return (
              <Dialog key={method.name}>
                <DialogTrigger asChild>
                  <Card className="flex h-full cursor-pointer flex-col items-center justify-center p-6 text-center transition-all hover:shadow-lg">
                    <div className="relative mb-4 h-16 w-16">
                      <Image
                        src={method.logo}
                        alt={`${method.name} logo`}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <p className="font-semibold">{method.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {method.description}
                    </p>
                  </Card>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Pay with {method.name}</DialogTitle>
                    <DialogDescription>
                      Scan the QR code below to complete the payment.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-center p-4">
                    <Image
                      src={method.qrCode!}
                      alt={`${method.name} QR Code`}
                      width={250}
                      height={250}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            );
          }
          if (method.type === 'link') {
            return (
              <Link key={method.name} href={method.href!} target="_blank">
                <Card className="flex h-full cursor-pointer flex-col items-center justify-center p-6 text-center transition-all hover:shadow-lg">
                  <div className="relative mb-4 h-16 w-16">
                    <Image
                      src={method.logo}
                      alt={`${method.name} logo`}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p className="font-semibold">{method.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {method.description}
                  </p>
                </Card>
              </Link>
            );
          }
          return null;
        })}
      </CardContent>
      <CardContent>
        <Card className="mt-4">
          <CardHeader className="flex-row items-center gap-4">
            <Banknote className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>Corporate Billing</CardTitle>
              <CardDescription>
                Available for Enterprise+ clients only.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </CardContent>
       <CardFooter>
          <p className="text-sm text-muted-foreground">
            All payments must be made in Philippine Pesos (₱) and confirmed
            before deliveries continue or new allocations are released.
          </p>
        </CardFooter>
    </Card>
  );
}
