
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Client, OnboardingStep } from '@/lib/definitions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, CheckCircle, Clock, Ship, Copy, AlertTriangle } from 'lucide-react';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const OnboardingStepItem = ({ step, isLast }: { step: OnboardingStep; isLast: boolean }) => (
  <div className="flex gap-x-4">
    <div className={cn(
        "relative last:after:hidden after:absolute after:top-11 after:bottom-0 after:w-px after:bg-border after:left-1/2 after:-translate-x-1/2",
        !isLast && "min-h-[7rem]"
    )}>
        <div className="relative z-10 flex h-10 w-10 items-center justify-center">
            <div
                className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full ring-4 ring-background",
                step.status === 'completed' ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-700"
                )}
            >
                {step.status === 'completed' ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                )}
            </div>
        </div>
    </div>

    <div className="grow pt-1.5 pb-8">
      <h3 className="font-semibold text-foreground">{step.title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
      {step.providerName && (
        <Card className="mt-3 bg-muted/50">
            <CardHeader className="p-3">
                <CardTitle className="text-sm">Paired Water Provider</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 text-sm">
                 <div className="flex items-center gap-3">
                    <Ship className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="font-semibold">{step.providerName}</p>
                        <p className="text-xs text-muted-foreground">{step.providerLocation}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
      )}
      {step.date && (
        <p className="mt-2 text-xs text-muted-foreground">
          Completed on: {step.date}
        </p>
      )}
    </div>
  </div>
);


const defaultOnboardingSteps: OnboardingStep[] = [
    { title: 'Confirmation and verification of payment', description: 'Initial subscription payment has been successfully processed.', status: 'pending' },
    { title: 'Onboarding & Account Creation', description: 'Your account is being set up in our system.', status: 'pending' },
    { title: 'First Delivery Scheduled', description: 'The first batch of water and equipment is scheduled for delivery within 24 hours.', status: 'pending' },
    { title: 'Automated Refills Enabled', description: 'The smart refill system is now active.', status: 'pending' },
];


function OnboardingStatusContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const clientDocRef = useMemoFirebase(
    () => (firestore && clientId ? doc(firestore, 'clients', clientId) : null),
    [firestore, clientId]
  );
  
  const { data: client, isLoading, error } = useDoc<Client>(clientDocRef);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
        title: 'Link Copied!',
        description: 'You can use this link to check your status anytime.'
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !client) {
    return (
        <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="mt-4">Could Not Load Status</CardTitle>
                <CardDescription>We couldn't find the onboarding status for the provided Client ID. Please check the link and try again.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  const onboardingStepsToDisplay = client.onboardingStatus || defaultOnboardingSteps;
  const isComplete = onboardingStepsToDisplay.every(step => step.status === 'completed');

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center space-y-4">
        <Logo className="mx-auto h-12 w-12" />
        <CardTitle>Onboarding Status for {client.companyName}</CardTitle>
        <CardDescription>
            You can bookmark this page to track your progress.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
            {onboardingStepsToDisplay.map((step, index) => (
                <OnboardingStepItem 
                    key={index} 
                    step={step} 
                    isLast={index === onboardingStepsToDisplay.length - 1} 
                />
            ))}
        </div>
        {isComplete && (
            <div className="mt-4 p-4 text-center bg-green-100 text-green-800 rounded-lg">
                <h3 className="font-bold">Onboarding Complete!</h3>
                <p className="text-sm">Welcome to Smart Refill! Your account is fully active. You can now log in to your client portal.</p>
            </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-4 text-center">
        <Button onClick={handleCopyLink} variant="outline" className="w-full">
            <Copy className="mr-2 h-4 w-4" /> Copy Status Link
        </Button>
        <p className="text-xs text-muted-foreground">
          If you have any questions, please contact your sales representative or email us at <a href="mailto:sales@smartrefill.io" className="font-semibold text-primary hover:underline">sales@smartrefill.io</a>.
        </p>
      </CardFooter>
    </Card>
  );
}

export default function OnboardingStatusPage() {
    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
             <Suspense fallback={<Loader2 className="h-12 w-12 animate-spin text-primary" />}>
                <OnboardingStatusContent />
            </Suspense>
        </main>
    )
}
