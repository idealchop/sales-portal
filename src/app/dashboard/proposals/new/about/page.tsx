

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { RefreshCw, Globe, LayoutDashboard, ShieldCheck, Scaling } from 'lucide-react';

function SmartRefillIntro() {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>What is Smart Refill?</CardTitle>
        <CardDescription>
          An overview of the value proposition.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid md:grid-cols-2 gap-8 items-start text-sm text-muted-foreground prose">
            <div className="space-y-6 max-w-prose">
                <p className="font-semibold text-foreground">
                Smart Refill is the Philippines’ first automated water refill system
                for businesses — built to make water supply safe, seamless, and
                scalable.
                </p>
                <p>
                We connect businesses directly to a nationwide network of verified and
                compliant local water refilling stations, ensuring every delivery is
                automatic, on time, and fully compliant with sanitation and water
                quality standards.
                </p>
                <p>
                Businesses no longer need to worry about reordering
                water — refills are delivered automatically. You can easily monitor
                consumption, providers, and payments, and scale your operations
                anytime, all through one Smart Refill Client Portal.
                </p>
            </div>
            
            <div>
                <h3 className="font-semibold text-foreground text-base">Smart Refill powers your business with:</h3>
                <div className="space-y-4 mt-4">
                    <div className="flex items-start gap-3">
                        <RefreshCw className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        <div>
                            <span className="font-semibold text-foreground">Automated Refills</span> – No more texts, calls, or manual orders.
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                        <Globe className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        <div>
                            <span className="font-semibold text-foreground">Nationwide Access</span> – Refill anywhere in the Philippines with verified partners.
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                        <LayoutDashboard className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        <div>
                            <span className="font-semibold text-foreground">Centralized Dashboard</span> – Monitor water usage, billing, and deliveries in real time.
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        <div>
                            <span className="font-semibold text-foreground">Compliance Assurance</span> – Every refill meets sanitation and safety standards.
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                        <Scaling className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        <div>
                            <span className="font-semibold text-foreground">Scalable Plans</span> – Flexible liters and billing for every business size.
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="relative aspect-video rounded-lg overflow-hidden">
            <Image 
                src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FSmartRefill_02.jpg?alt=media&token=a39726f6-1ed3-436c-8636-25cb4f297aab"
                alt="Smart Refill service infographic"
                fill
                className="object-cover"
                data-ai-hint="infographic water service"
            />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AboutPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">About Smart Refill</h1>
                    <p className="text-muted-foreground">
                        Step 2: An overview of Smart Refill for the client
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/proposals/new">Previous</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/dashboard/proposals/new/comparison">Next Step</Link>
                    </Button>
                </div>
            </div>
            <SmartRefillIntro />
        </div>
    )
}
