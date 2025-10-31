'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  UsersRound,
  FileText,
  BookCopy,
  CircleDollarSign,
  Settings,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/clients', icon: UsersRound, label: 'Clients' },
  { href: '/dashboard/proposals', icon: FileText, label: 'Proposals' },
  { href: '/dashboard/materials', icon: BookCopy, label: 'Materials' },
  { href: '/dashboard/commissions', icon: CircleDollarSign, label: 'Commissions' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu className="p-2">
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
            tooltip={{ children: item.label }}
            variant="default"
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
