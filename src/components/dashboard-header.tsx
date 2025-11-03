
'use client';
import Link from 'next/link';
import { Bell, User, Calendar as CalendarIcon, Upload, LogOut, Settings, HelpCircle, Star, Percent, CreditCard, ChevronRight, Users, Trash2 } from 'lucide-react';
import {
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import React from 'react';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Logo } from './logo';
import Image from 'next/image';
import { Badge } from './ui/badge';


function QrCodeIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        >
        <rect width="5" height="5" x="3" y="3" rx="1" />
        <rect width="5" height="5" x="16" y="3" rx="1" />
        <rect width="5" height="5" x="3" y="16" rx="1" />
        <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
        <path d="M21 21v.01" />
        <path d="M12 7v3a2 2 0 0 1-2 2H7" />
        <path d="M9 17a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2Z" />
        <path d="M7 12h.01" />
        </svg>
    );
}


export function DashboardHeader() {
  const [date, setDate] = React.useState<Date>();
  const referralLink = "https://smartrefill.app/referral?code=SR12345";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(referralLink)}&size=200x200&bgcolor=F1F8E9`;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <SidebarTrigger />
      
      <div className="ml-auto flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle notifications</span>
        </Button>
        <Dialog>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="overflow-hidden rounded-full">
                <Avatar className="h-9 w-9">
                    <AvatarImage src="https://picsum.photos/seed/avatar/32/32" alt="User Avatar" />
                    <AvatarFallback>SA</AvatarFallback>
                </Avatar>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="p-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src="https://picsum.photos/seed/avatar/48/48" alt="User Avatar" />
                            <AvatarFallback>SA</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-base font-semibold leading-none">Sandra Adams</p>
                            <p className="text-sm text-muted-foreground">Sales Representative, Team Alpha</p>
                             <div className="mt-2 flex items-center gap-2">
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                    <Star className="mr-1 h-3 w-3" />
                                    Top Performer
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator />
                
                <div className="p-2">
                    <DialogTrigger asChild>
                         <Button variant="ghost" className="w-full justify-start text-sm">
                            <User className="mr-2 h-4 w-4" />
                            <span>View or Edit Profile</span>
                        </Button>
                    </DialogTrigger>
                </div>
                
                <Separator />

                <div className="p-4 text-sm">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                                <QrCodeIcon className="mr-2 h-4 w-4" />
                                Refer a friend to join the team
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Refer a Friend</DialogTitle>
                                <DialogDescription>
                                    Share this QR code with a friend to have them join the team. They can scan it with their phone's camera.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex items-center justify-center p-4 bg-background rounded-lg">
                                <Image src={qrCodeUrl} alt="Referral QR Code" width={200} height={200} />
                            </div>
                            <DialogFooter className="sm:justify-start">
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="link" className="sr-only">
                                        Link
                                    </Label>
                                    <Input id="link" defaultValue={referralLink} readOnly />
                                    <Button type="submit" size="sm" className="w-full" onClick={() => navigator.clipboard.writeText(referralLink)}>
                                        Copy Link
                                    </Button>
                                </div>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <Separator />

                <div className="p-2">
                    <Link href="/dashboard/settings" className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span>Account & Preferences</span>
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                    </Link>
                    <Link href="#" className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent">
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        <span>Help & Features</span>
                         <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                    </Link>
                </div>

                <Separator />
                
                <div className="p-2">
                    <Link href="/login" className="flex items-center gap-2 rounded-md p-2 text-sm text-destructive hover:bg-destructive/10">
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                    </Link>
                </div>

            </PopoverContent>
          </Popover>
           <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Make changes to your profile here. Click save when you are done.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    <div className="md:col-span-1">
                        <div className="space-y-4">
                             <div>
                                <h3 className="text-lg font-medium">Avatar</h3>
                                <p className="text-sm text-muted-foreground">
                                    Update your profile picture.
                                </p>
                            </div>
                            <div className="flex flex-col items-center gap-4 rounded-md border p-8">
                                <Avatar className="h-24 w-24 cursor-pointer">
                                    <AvatarImage src="https://picsum.photos/seed/avatar/96/96" alt="User Avatar" />
                                    <AvatarFallback>SA</AvatarFallback>
                                </Avatar>
                                <Button variant="outline" size="sm">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="md:col-span-2 space-y-8">
                        <div>
                             <h3 className="text-lg font-medium">Personal Information</h3>
                             <Separator className="mt-2" />
                             <div className="space-y-4 mt-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input id="name" defaultValue="Sandra Adams" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" defaultValue="sandra.adams@example.com" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="dob">Birthday</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit">Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
