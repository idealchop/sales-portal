'use client';
import Link from 'next/link';
import { Search, Bell, User, Calendar as CalendarIcon, Upload } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
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


export function DashboardHeader() {
  const [date, setDate] = React.useState<Date>();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <SidebarTrigger />
      
      <div className="relative ml-auto flex-1 md:grow-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
        />
      </div>
      <Button variant="ghost" size="icon" className="rounded-full">
        <Bell className="h-5 w-5" />
        <span className="sr-only">Toggle notifications</span>
      </Button>
      <Dialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="overflow-hidden rounded-full">
              <Avatar className="h-9 w-9">
                  <AvatarImage src="https://picsum.photos/seed/avatar/32/32" alt="User Avatar" />
                  <AvatarFallback>SA</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Sandra Adams</p>
                      <p className="text-xs leading-none text-muted-foreground">
                          sandra.adams@example.com
                      </p>
                  </div>
              </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DialogTrigger asChild>
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Edit Profile</span>
              </DropdownMenuItem>
            </DialogTrigger>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/login">Logout</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
                Make changes to your profile here. Click save when you're done.
            </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src="https://picsum.photos/seed/avatar/64/64" alt="User Avatar" />
                        <AvatarFallback>SA</AvatarFallback>
                    </Avatar>
                    <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                    </Button>
                </div>
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
            <DialogFooter>
            <Button type="submit">Save changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
