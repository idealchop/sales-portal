
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
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/definitions';

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

function ProtectedDashboard({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait until both authentication and profile data are finished loading
    if (isUserLoading || isProfileLoading) {
      return;
    }

    // If there is no authenticated user, redirect to login
    if (!user) {
      router.push('/login');
      return;
    }

    // If there IS a user, but their profile doesn't exist OR onboarding is incomplete,
    // redirect them to onboarding.
    // This now correctly assumes a Cloud Function creates the user document on sign-up.
    if (!userProfile || !userProfile.onboardingCompleted) {
        router.push('/onboarding/password');
        return;
    }

    // If user is authenticated and onboarded, allow access to the dashboard
    setIsChecking(false);

  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  if (isChecking) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
    );
  }

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
    </SidebarProvider>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <ProtectedDashboard>{children}</ProtectedDashboard>
    </FirebaseClientProvider>
  );
}
