
'use client';

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
import { RefreshCw, Globe, LayoutDashboard, ShieldCheck, Scaling, Map } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { GoogleMap } from '@/components/google-map';
import { stationMarkers } from '@/lib/water-stations';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


function SmartRefillIntro() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address') || '';

  return (
    <Card className="flex-1 overflow-hidden">
        <div className="grid md:grid-cols-2">
            <div className="p-8 space-y-6">
                <CardHeader className="p-0">
                    <CardTitle>What is Smart Refill?</CardTitle>
                    <CardDescription>
                        An overview of our value proposition.
                    </CardDescription>
                </CardHeader>
                <div className="space-y-4 text-sm text-muted-foreground">
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
                </div>
                 <div>
                    <h3 className="font-semibold text-foreground text-base mb-4">Smart Refill powers your business with:</h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <RefreshCw className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                            <div>
                                <span className="font-semibold text-foreground">Automated Refills</span>
                                <p className="text-xs text-muted-foreground">No more texts, calls, or manual orders.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Globe className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                            <div>
                                <span className="font-semibold text-foreground">Nationwide Access</span>
                                <p className="text-xs text-muted-foreground">Refill anywhere in the Philippines with verified partners.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <LayoutDashboard className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                            <div>
                                <span className="font-semibold text-foreground">Centralized Dashboard</span>
                                <p className="text-xs text-muted-foreground">Monitor water usage, billing, and deliveries in real time.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                            <div>
                                <span className="font-semibold text-foreground">Compliance Assurance</span>
                                <p className="text-xs text-muted-foreground">Every refill meets sanitation and safety standards.</p>
                            </div>
                        </div>
                    </div>
                </div>
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" disabled={!address}>
                                            <Map className="mr-2 h-4 w-4" /> See Partner Stations
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
                                        <DialogHeader>
                                            <DialogTitle>Nearby Partner Water Stations</DialogTitle>
                                            <DialogDescription>
                                                Showing stations near {address}.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="h-full w-full rounded-md overflow-hidden flex-1">
                                            <GoogleMap address={address} onAddressChange={() => {}} additionalMarkers={stationMarkers} />
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </TooltipTrigger>
                        {!address && (
                            <TooltipContent>
                                <p>Please enter a client address to see nearby stations.</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </div>
            <div className="relative min-h-[400px] hidden md:block">
                <Image 
                    src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2Flanding%20page%20image.png?alt=media&token=bce76780-73c9-4b4c-8e6f-83e5234d337a"
                    alt="Smart Refill App on a phone"
                    fill
                    className="object-contain p-8"
                    data-ai-hint="app interface"
                />
            </div>
        </div>
    </Card>
  );
}

export default function AboutPage() {
    const searchParams = useSearchParams();
    const params = new URLSearchParams(searchParams.toString());

    const prevLink = `/proposal/new?${params.toString()}`;
    const nextLink = `/proposal/new/comparison?${params.toString()}`;


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
                        <Link href={prevLink}>Previous</Link>
                    </Button>
                    <Button asChild>
                        <Link href={nextLink}>Next Step</Link>
                    </Button>
                </div>
            </div>
            <SmartRefillIntro />
        </div>
    )
}
