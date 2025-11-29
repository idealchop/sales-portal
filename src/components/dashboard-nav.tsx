
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
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['sales', 'admin'], exclude: ['manager'] },
  { href: '/dashboard/my-team', icon: TeamIcon, label: 'My Team', roles: ['manager'] },
  { href: '/dashboard/proposals', icon: FileText, label: 'Proposals & Clients', roles: ['sales', 'manager', 'admin'] },
  { href: '/dashboard/materials', icon: BookCopy, label: 'Materials', roles: ['sales', 'manager', 'admin'] },
  { href: '/dashboard/content-studio', icon: Megaphone, label: 'Content Studio', roles: ['sales', 'manager', 'admin'] },
  { href: '/admin', icon: ShieldCheck, label: 'Admin', roles: ['admin'] },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { user, isUserLoading, isAdmin, isManager } = useUser();
  const { toast } = useToast();

  const userRoles = [
    'sales',
    ...(isAdmin ? ['admin'] : []),
    ...(isManager ? ['manager'] : []),
  ];

  const handleUnderConstructionClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    toast({
      title: "Under Construction",
      description: "This feature is currently under development and will be available soon!",
    });
  };

  if (isUserLoading) {
    return <p>Loading...</p>
  }

  const filteredNavItems = navItems.filter(item => {
    const hasRole = item.roles.some(role => userRoles.includes(role));
    const isExcluded = item.exclude?.some(role => userRoles.includes(role));
    return hasRole && !isExcluded;
  });

  return (
    <SidebarMenu className="p-2">
      {filteredNavItems.map((item) => {
          const isUnderConstruction = item.href === '#';
          const isActive = item.href === '/dashboard' 
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <SidebarMenuItem key={item.href + item.label}>
              <SidebarMenuButton
                asChild
                isActive={isActive && !isUnderConstruction}
                tooltip={{ children: item.label }}
                variant="default"
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                onClick={isUnderConstruction ? handleUnderConstructionClick : undefined}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
    </SidebarMenu>
  );
}
