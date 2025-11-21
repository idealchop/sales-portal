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
  Megaphone,
  ShieldCheck,
  Users as TeamIcon
} from 'lucide-react';
import { useUser } from '@/firebase';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['sales', 'manager', 'admin'] },
  { href: '/dashboard/proposals', icon: FileText, label: 'Proposals', roles: ['sales', 'manager', 'admin'] },
  { href: '/dashboard/materials', icon: BookCopy, label: 'Materials', roles: ['sales', 'manager', 'admin'] },
  { href: '/dashboard/content-studio', icon: Megaphone, label: 'Content Studio', roles: ['sales', 'manager', 'admin'] },
  { href: '/dashboard/my-team', icon: TeamIcon, label: 'My Team', roles: ['manager'] },
  { href: '/admin', icon: ShieldCheck, label: 'Admin', roles: ['admin'] },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { user, isUserLoading, isAdmin, isManager } = useUser();

  const userRoles = [
    'sales',
    ...(isAdmin ? ['admin'] : []),
    ...(isManager ? ['manager'] : []),
  ];

  if (isUserLoading) {
    return <p>Loading...</p>
  }

  return (
    <SidebarMenu className="p-2">
      {navItems
        .filter(item => item.roles.some(role => userRoles.includes(role)))
        .map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href) && (item.href === '/dashboard' ? pathname === item.href : true)}
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
