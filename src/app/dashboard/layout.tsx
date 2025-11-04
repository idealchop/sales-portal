'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  useSidebar,
} from '@/components/ui/sidebar';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardHeader } from '@/components/dashboard-header';
import { cn } from '@/lib/utils';
import { FirebaseClientProvider, useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/definitions';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

function DashboardSidebar() {
  const { state } = useSidebar();
  return (
      <Sidebar side="left" variant="floating" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
           <div className="flex items-center gap-3 p-2">
            <Image src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Brand%20Logo%2FAsset%2022.png?alt=media&token=f7458efe-afd7-4006-862e-40c8d524c080" width={32} height={32} alt="Smart Refill Logo" />
            <div className={cn("flex flex-col transition-opacity duration-200", state === "collapsed" ? "opacity-0" : "opacity-100")}>
                <span className="text-lg font-semibold font-headline text-sidebar-foreground whitespace-nowrap">
                    Smart Refill
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Sales Portal
                </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <DashboardNav />
        </SidebarContent>
      </Sidebar>
  )
}

function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const [isGatekeeperActive, setIsGatekeeperActive] = useState(true);

  useEffect(() => {
    if (isUserLoading) {
      // Still waiting for Firebase Auth to initialize
      return;
    }

    if (!user) {
      // If user is not logged in, redirect to login and we're done.
      router.push('/login');
      return;
    }

    // From this point, we know we have an authenticated user.
    // Now we need to check their Firestore profile.
    if (isProfileLoading) {
      // Still waiting for their Firestore document to load
      return;
    }

    const checkAndCreateProfile = async () => {
      // We have an authenticated user, but no profile document yet.
      if (user && !userProfile) {
        try {
          // Create the initial user document immediately.
          await setDoc(doc(firestore, 'users', user.uid), {
            id: user.uid,
            email: user.email,
            onboardingCompleted: false, // Explicitly set to false
          });
          // The useDoc hook will automatically update with the new data,
          // triggering the next step in the effect. We don't need to set isGatekeeperActive to false here.
          // The redirect to onboarding will happen in the next pass of this effect.
        } catch (error) {
          console.error("Failed to create initial user profile:", error);
          // Handle error case, maybe show a toast
        }
      } else if (userProfile) {
        // We have a profile, now we can make a decision.
        if (!userProfile.onboardingCompleted) {
          // If onboarding is not complete, redirect to the onboarding flow.
          router.push('/onboarding/profile');
        } else {
          // Onboarding is complete, allow access to the dashboard.
          setIsGatekeeperActive(false);
        }
      }
    };

    checkAndCreateProfile();

  }, [user, userProfile, isUserLoading, isProfileLoading, firestore, router]);
  
  if (isGatekeeperActive) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
    );
  }

  // Standard dashboard view for authenticated, onboarded users
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <div className="flex flex-col flex-1">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">
                {children}
            </div>
        </main>
      </div>
      <FirebaseErrorListener />
    </SidebarProvider>
  );
}


export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <ProtectedLayout>{children}</ProtectedLayout>
    </FirebaseClientProvider>
  );
}
