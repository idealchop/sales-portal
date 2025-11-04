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
import { useRouter, usePathname } from 'next/navigation';
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

function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();

  const isAuthRoute = pathname.startsWith('/login');
  const isOnboardingRoute = pathname.startsWith('/onboarding');
  
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Don't run auth checks on login page
    if (isAuthRoute) {
        setIsChecking(false);
        return;
    }

    if (isUserLoading || (user && isProfileLoading)) {
      return; // Wait until loading is complete
    }

    // If on any protected route and not logged in, redirect to login
    if (!user && !isAuthRoute) {
      router.push('/login');
      return;
    }
    
    // Logic for authenticated users
    if (user) {
        // If user is authenticated, but no profile exists OR onboarding is not complete,
        // and they are NOT already on an onboarding page, redirect them.
        if ((!userProfile || !userProfile.onboardingCompleted) && !isOnboardingRoute) {
            router.push('/onboarding/profile');
            return;
        }

        // If user is onboarded and tries to access an onboarding page, send them to the dashboard.
        if (userProfile && userProfile.onboardingCompleted && isOnboardingRoute) {
            router.push('/dashboard');
            return;
        }
    }
    
    // If none of the above conditions are met, the user is clear to access the current page.
    setIsChecking(false);

  }, [user, userProfile, isUserLoading, isProfileLoading, router, pathname, isAuthRoute, isOnboardingRoute]);
  
  if (isChecking) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
    );
  }

  // Render children based on the route type
  if (isAuthRoute || isOnboardingRoute) {
      return <>{children}</>;
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
