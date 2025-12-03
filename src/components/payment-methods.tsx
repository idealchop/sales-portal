
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
import { Separator } from './ui/separator';

const paymentOptions = [
  {
    name: 'Bank Transfer',
    description: 'BPI, BDO, UnionBank',
    logo: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FPayments%2Fwaterstations_unionbank.png?alt=media&token=e5428cad-1392-456e-a2fb-24026e848015',
    qrCode: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FPayments%2Friver_BPI.png?alt=media&token=6ac4fd16-2014-40fe-b7cf-1fdf3e94a61e',
    accountDetails: {
        'Bank': 'Bank of the Philippine Islands',
        'Account Name': 'Jimboy Regalado',
        'Account Number': '3489145013',
    },
    type: 'dialog',
  },
  {
    name: 'GCash',
    description: 'Pay with GCash',
    logo: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FPayments%2Fwaterstations_gcash.png?alt=media&token=3dbf2d18-cd4a-4ab1-a0e2-3b9952c42412',
    qrCode: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FPayments%2FRiver_gcash.png?alt=media&token=13c80b31-8f08-4857-a066-5a666d546d81',
    accountDetails: {
        'Account Name': 'Jimboy Regalado',
        'GCash Number': '09989811596',
    },
    type: 'dialog',
  },
  {
    name: 'Maya',
    description: 'Pay with Maya',
    logo: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FPayments%2Fwaterstations_Maya.png?alt=media&token=1fd59b11-8b0c-4a6a-bcf8-4a6f38bdb9c4',
    qrCode: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FPayments%2Friver_maya.png?alt=media&token=a3ca4e56-c797-4d9a-8dcd-4b78a0a96965',
    accountDetails: {
        'Account Name': 'Jimboy Regalado',
        'Maya Number': '09557750188',
    },
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
                  <div className="relative h-20 w-full cursor-pointer rounded-lg bg-card p-4 transition-all hover:bg-muted">
                    <Image
                      src={method.logo}
                      alt={`${method.name} logo`}
                      fill
                      className="object-contain"
                    />
                  </div>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Pay with {method.name}</DialogTitle>
                    <DialogDescription>
                      Scan the QR code below or use the details provided to complete the payment.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-center p-4">
                    <Image
                      src={method.qrCode!}
                      alt={`${method.name} QR Code`}
                      width={250}
                      height={250}
                      className="rounded-lg"
                    />
                  </div>
                  {method.accountDetails && (
                    <div className="space-y-4 rounded-md border bg-muted/50 p-4">
                        <h4 className="font-semibold">Account Details</h4>
                        <Separator />
                        <div className="space-y-2 text-sm">
                            {Object.entries(method.accountDetails).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                    <span className="text-muted-foreground">{key}:</span>
                                    <span className="font-mono font-semibold">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}
                  <CardFooter>
                    <p className="text-xs text-muted-foreground">
                        Please send a screenshot of the transaction confirmation to your sales agent to finalize the order.
                    </p>
                  </CardFooter>
                </DialogContent>
              </Dialog>
            );
          }
          if (method.type === 'link') {
            return (
              <Link key={method.name} href={method.href!} target="_blank">
                <div className="relative h-20 w-full cursor-pointer rounded-lg bg-card p-4 transition-all hover:bg-muted">
                  <Image
                    src={method.logo}
                    alt={`${method.name} logo`}
                    fill
                    className="object-contain"
                  />
                </div>
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
