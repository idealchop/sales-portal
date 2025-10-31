import type { ReactNode } from 'react';
import Image from 'next/image';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardHeader } from '@/components/dashboard-header';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar side="left" variant="floating" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
           <div className="flex items-center gap-3 p-2">
            <Image src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Brand%20Logo%2FAsset%2022.png?alt=media&token=f7458efe-afd7-4006-862e-40c8d524c080" width={32} height={32} alt="Smart Refill Logo" />
            <span className="text-lg font-semibold font-headline text-sidebar-foreground">Smart Refill</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <DashboardNav />
        </SidebarContent>
        <SidebarFooter className='border-t border-sidebar-border'>
          <div className="flex items-center gap-3 p-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src="https://picsum.photos/seed/avatar/36/36" alt="User Avatar" />
              <AvatarFallback>SA</AvatarFallback>
            </Avatar>
            <div className='flex flex-col'>
                <p className="text-sm font-medium text-sidebar-foreground">Sandra Adams</p>
                <p className='text-xs text-muted-foreground'>sandra.adams@example.com</p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col bg-muted/40">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
