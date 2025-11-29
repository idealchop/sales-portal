
'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  useSidebar,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardHeader } from '@/components/dashboard-header';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

function DashboardSidebar() {
  const { state } = useSidebar();
  const packageJson = require('../../../package.json');
  const version = packageJson.version;

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
        <SidebarFooter className="p-4 border-t border-sidebar-border">
             <div className={cn(
                "flex items-center justify-between text-xs text-muted-foreground",
                state === 'collapsed' && 'justify-center'
             )}>
                <span className={cn(state === 'collapsed' && 'hidden')}>Version</span>
                <span>{version}</span>
            </div>
        </SidebarFooter>
      </Sidebar>
  )
}

function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading, isManager } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) {
      return; 
    }

    if (user) {
      const checkUserOnboarding = async () => {
        const docRef = doc(firestore, 'sales', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (!userData.onboardingCompleted) {
            router.push('/onboarding/profile');
          } else if (isManager && pathname === '/dashboard') {
            router.replace('/dashboard/my-team');
          }
        } else {
          console.error("User document not found, redirecting to login.");
          router.push('/login');
        }
      };
      checkUserOnboarding();
    } else {
      router.push('/login');
    }
  }, [user, isUserLoading, firestore, router, isManager, pathname]);


  if (isUserLoading || !user || (isManager && pathname === '/dashboard')) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  return <>{children}</>;
}


export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <ProtectedLayout>
        <div className="relative flex h-screen w-full">
            <DashboardSidebar />
            <div className="flex flex-col flex-1">
            <DashboardHeader />
            <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <div className="mx-auto w-full max-w-7xl">
                    {children}
                </div>
            </main>
            </div>
        </div>
      </ProtectedLayout>
    </SidebarProvider>
  );
}
