
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
import { FirebaseClientProvider, useUser, useFirestore } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

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
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user state is loaded.
    }

    if (user) {
      // User is authenticated, now check their onboarding status from Firestore.
      const checkUserOnboarding = async () => {
        const docRef = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        // This component's only job is to check the flag and redirect.
        // It assumes the document has already been created by the login page.
        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (!userData.onboardingCompleted) {
            router.push('/onboarding/profile');
          }
          // If onboarding is completed, do nothing and allow access to the dashboard.
        } else {
          // This case should ideally not happen if the login page works correctly.
          // As a fallback, redirect to login to restart the process.
          console.error("User document not found, redirecting to login.");
          router.push('/login');
        }
      };
      checkUserOnboarding();
    } else {
      // No authenticated user, redirect to the login page.
      router.push('/login');
    }
  }, [user, isUserLoading, firestore, router]);


  // While loading user state or if there's no user, show a loading spinner.
  // This prevents a brief flash of content before the redirect can happen.
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If the user is authenticated and onboarding is complete, render the children.
  return <>{children}</>;
}


export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <SidebarProvider>
        <ProtectedLayout>
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
        </ProtectedLayout>
      </SidebarProvider>
    </FirebaseClientProvider>
  );
}
