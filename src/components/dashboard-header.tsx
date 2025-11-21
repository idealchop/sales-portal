
'use client';
import Link from 'next/link';
import { Bell, User, Calendar as CalendarIcon, Upload, LogOut, Settings, HelpCircle, Star, Percent, CreditCard, ChevronRight, Users, Trash2, Edit, X, Loader2, Award, Trophy, Filter, Receipt, CheckCircle, Clock } from 'lucide-react';
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
import { format, startOfMonth } from 'date-fns';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Logo } from './logo';
import Image from 'next/image';
import { Badge } from './ui/badge';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot, orderBy, limit } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { useProposals } from '@/hooks/use-proposals';
import { useClients } from '@/hooks/use-clients';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Commission, Notification } from '@/lib/definitions';
import { PayoutHistoryDialog } from './payout-history-dialog';


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

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, 'Please enter a valid mobile number.'),
  birthday: z.date().optional(),
});
type ProfileFormValues = z.infer<typeof profileSchema>;


function AchievementsDialogContent() {
    const { proposals, isLoading: proposalsLoading } = useProposals();
    const { clients, isLoading: clientsLoading } = useClients();
    const clientMap = useMemo(() => new Map(clients.map(client => [client.id, client])), [clients]);
    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    const [selectedYear, setSelectedYear] = useState<string>('all');

    const { unlockedAchievements, availableYears } = useMemo(() => {
        const corporateBonusTiers = [
            { target: 3, name: 'Corporate Closer I', bonus: 2000, icon: <Star className="h-5 w-5" />, color: 'text-yellow-400' },
            { target: 5, name: 'Corporate Closer II', bonus: 5000, icon: <Star className="h-5 w-5" />, color: 'text-yellow-400' },
            { target: 10, name: 'Corporate Closer III', bonus: 12000, icon: <Trophy className="h-5 w-5" />, color: 'text-amber-500' },
        ];
        const familyBonusTiers = [
            { target: 10, name: 'Family Plan Closer I', bonus: 2500, icon: <Star className="h-5 w-5" />, color: 'text-yellow-400' },
            { target: 20, name: 'Family Plan Closer II', bonus: 6000, icon: <Trophy className="h-5 w-5" />, color: 'text-amber-500' },
            { target: 30, name: 'Family Plan Closer III', bonus: 15000, icon: <Award className="h-5 w-5" />, color: 'text-violet-500' },
        ];
        
        if (proposalsLoading || clientsLoading) return { unlockedAchievements: [], availableYears: [] };

        const acceptedProposals = proposals.filter(p => p.status === 'accepted' && p.createdAt);

        const monthlyCounts: { [key: string]: { corporate: number, household: number } } = {};
        const yearSet = new Set<string>();
        
        for (const proposal of acceptedProposals) {
            const date = new Date(proposal.createdAt);
            const year = date.getFullYear().toString();
            const monthYear = format(date, 'MMMM yyyy');

            yearSet.add(year);
            
            if (!monthlyCounts[monthYear]) {
                monthlyCounts[monthYear] = { corporate: 0, household: 0 };
            }

            const client = clientMap.get(proposal.clientId);
            if (!client) continue;

            if (['sme', 'commercial', 'corporate', 'enterprise'].includes(client.clientType || '')) {
                monthlyCounts[monthYear].corporate++;
            } else if (client.clientType === 'household') {
                monthlyCounts[monthYear].household++;
            }
        }

        const achievements: { name: string; date: string; bonus: number; icon: React.ReactNode; color: string; }[] = [];

        for (const monthYear in monthlyCounts) {
            const { corporate, household } = monthlyCounts[monthYear];
            const achievementDate = monthYear;
            
            corporateBonusTiers.forEach(tier => {
                if(corporate >= tier.target) {
                   achievements.push({ name: tier.name, date: achievementDate, bonus: tier.bonus, icon: tier.icon, color: tier.color });
                }
            });

            familyBonusTiers.forEach(tier => {
                if(household >= tier.target) {
                   achievements.push({ name: tier.name, date: achievementDate, bonus: tier.bonus, icon: tier.icon, color: tier.color });
                }
            });
        }
        
        const filteredAchievements = achievements.filter(ach => {
            const achDate = new Date(ach.date);
            return selectedYear === 'all' || achDate.getFullYear().toString() === selectedYear;
        });

        filteredAchievements.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { 
            unlockedAchievements: filteredAchievements,
            availableYears: Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a)),
        };

    }, [proposals, clients, proposalsLoading, clientsLoading, clientMap, selectedYear]);


    if (proposalsLoading || clientsLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <DialogTitle>My Achievements</DialogTitle>
                        <DialogDescription>
                            A history of your unlocked bonuses and milestones.
                        </DialogDescription>
                    </div>
                     <div className="flex items-center gap-2 pt-1.5">
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by year" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Years</SelectItem>
                                {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </DialogHeader>
            <div className="space-y-4">
                <ScrollArea className="h-[60vh] pr-4 -mr-4">
                    {unlockedAchievements.length > 0 ? (
                       <div className="relative pl-6 after:absolute after:inset-y-0 after:w-px after:bg-border after:left-0">
                           {unlockedAchievements.map((ach, index) => (
                               <div key={index} className="grid grid-cols-[auto_1fr] gap-x-6 pb-8">
                                   <div className={cn("relative", ach.color)}>
                                        <div className="relative">
                                            {React.cloneElement(ach.icon as React.ReactElement, { className: "h-6 w-6" })}
                                            <span className="absolute -top-1 -left-1 h-3 w-3 rounded-full bg-background ring-2 ring-border"></span>
                                        </div>
                                   </div>
                                   <div className="space-y-1">
                                       <h3 className="font-semibold text-base">{ach.name}</h3>
                                       <p className="text-sm text-muted-foreground">Unlocked: {ach.date}</p>
                                        <Badge variant="secondary" className="text-sm font-bold">{currencyFormatter.format(ach.bonus)}</Badge>
                                   </div>
                               </div>
                           ))}
                       </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center py-16">
                            <Award className="h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No Achievements Yet</h3>
                            <p className="text-sm text-muted-foreground">Keep closing deals to unlock your first achievement!</p>
                        </div>
                    )}
                </ScrollArea>
            </div>
        </DialogContent>
    );
}

function ProfileDialogContent() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            displayName: "",
            email: "",
            phone: "",
            birthday: undefined,
        },
    });

    const populateForm = (userData: any) => {
        form.reset({
            displayName: userData.displayName || "",
            email: userData.email || "",
            phone: userData.phone || '',
            birthday: userData.birthday ? new Date(userData.birthday) : undefined,
        });
        if (userData.photoURL) {
            setPhotoPreview(userData.photoURL);
        } else {
            setPhotoPreview(null);
        }
    };

    const fetchProfile = async () => {
        if (user) {
            const userDocRef = doc(firestore, 'sales', user.uid);
            const userDocSnap = await (await import('firebase/firestore')).getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                populateForm({ ...user, ...data });
            } else {
                populateForm(user);
            }
        }
    };
    
    useEffect(() => {
        fetchProfile();
    }, [user]);

    const getInitials = (name: string | null) => {
        if (!name) return user?.email?.[0].toUpperCase() || 'U';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2);
    }
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleRemovePhoto = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPhotoFile(null);
        setPhotoPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        fetchProfile(); // Revert changes by fetching original data
    };

    const onSubmit = async (data: ProfileFormValues) => {
        if (!user) return;
        setIsSaving(true);
        try {
            let photoURL = user.photoURL;

            if (photoFile) {
                const storage = getStorage();
                const filePath = `user-avatars/${user.uid}/${photoFile.name}`;
                const storageRef = ref(storage, filePath);
                const snapshot = await uploadBytes(storageRef, photoFile);
                photoURL = await getDownloadURL(snapshot.ref);
            } else if (!photoPreview && user.photoURL) {
                const storage = getStorage();
                const photoRef = ref(storage, user.photoURL);
                await deleteObject(photoRef).catch(e => console.warn("Old photo deletion failed:", e));
                photoURL = null;
            }

            await updateProfile(user, { displayName: data.displayName, photoURL: photoURL });

            const userDocRef = doc(firestore, 'sales', user.uid);
            await updateDoc(userDocRef, {
                displayName: data.displayName,
                phone: data.phone,
                birthday: data.birthday?.toISOString(),
                photoURL: photoURL,
            });

            toast({ title: "Profile Updated", description: "Your profile has been successfully saved." });
            setIsEditing(false);
        } catch (error: any) {
            console.error("Profile update error:", error);
            toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not save your profile." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Profile' : 'My Profile'}</DialogTitle>
                <DialogDescription>
                    {isEditing ? 'Make changes to your profile here.' : 'View your personal information below.'}
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-3 py-6">
                        <div className="md:col-span-1">
                            <div className="flex flex-col items-center gap-4 pt-4">
                                <div className="relative group">
                                    <Avatar className="h-32 w-32" onClick={() => isEditing && fileInputRef.current?.click()}>
                                        <AvatarImage src={photoPreview || undefined} alt="User Avatar" />
                                        <AvatarFallback className="text-4xl">{getInitials(form.watch('displayName'))}</AvatarFallback>
                                    </Avatar>
                                    {isEditing && (
                                        <>
                                            <div className={cn("absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity", isEditing ? 'cursor-pointer' : 'cursor-default')}>
                                                <Upload className="h-8 w-8 text-white" />
                                            </div>
                                            {photoPreview && (
                                                <button type="button" onClick={handleRemovePhoto} className="absolute -top-2 -right-2 h-8 w-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:bg-destructive/90 transition-all" aria-label="Remove photo">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/gif" disabled={!isEditing} />
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <FormField control={form.control} name="displayName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Display Name</FormLabel>
                                    <FormControl><Input {...field} disabled={!isEditing} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input type="email" {...field} readOnly disabled /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mobile Number</FormLabel>
                                        <FormControl><Input {...field} disabled={!isEditing} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="birthday" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Birthday</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild disabled={!isEditing}>
                                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground", !isEditing && "bg-muted/50 cursor-not-allowed")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 80} toYear={new Date().getFullYear() - 18} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        {isEditing ? (
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={handleCancel}>
                                    <X className="mr-2 h-4 w-4" /> Cancel
                                </Button>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        ) : (
                            <Button type="button" onClick={() => setIsEditing(true)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Profile
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    );
}

function NotificationsPopover() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const notifsQuery = query(
            collection(firestore, `users/${user.uid}/notifications`),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(notifsQuery, (snapshot) => {
            const fetched: Notification[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                fetched.push({
                    id: doc.id,
                    ...data,
                    createdAt: (data.createdAt as any)?.toDate()
                } as Notification);
            });
            setNotifications(fetched);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, firestore]);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative">
                    <Bell className="h-5 w-5" />
                    {notifications.some(n => !n.isRead) && (
                        <span className="absolute top-1 right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                    )}
                    <span className="sr-only">Toggle notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                </div>
                <ScrollArea className="h-80">
                    {isLoading ? (
                         <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                        </div>
                    ) : notifications.length > 0 ? (
                        <div className="divide-y">
                            {notifications.map(notif => (
                                <div key={notif.id} className={cn("p-4 flex items-start gap-3", !notif.isRead && "bg-primary/5")}>
                                     <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1", notif.type === 'payout' ? 'bg-green-100' : 'bg-blue-100')}>
                                        <CreditCard className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{notif.title}</p>
                                        <p className="text-xs text-muted-foreground">{notif.message}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{notif.createdAt ? format(new Date(notif.createdAt), 'PPp') : ''}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <Bell className="h-10 w-10 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">No new notifications.</p>
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

export function DashboardHeader() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'SR';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  const roleDisplayNames: { [key: string]: string } = {
    sales: 'Sales Executive',
    manager: 'Sales Manager',
    admin: 'Administrator',
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <SidebarTrigger />
      
      <div className="ml-auto flex items-center gap-2">
        <NotificationsPopover />

        <Dialog>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="overflow-hidden rounded-full">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.photoURL ?? undefined} alt="User Avatar" />
                    <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                </Avatar>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="p-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={user?.photoURL ?? undefined} alt="User Avatar" />
                            <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-base font-semibold leading-none">{user?.displayName ?? 'Sales Rep'}</p>
                            <p className="text-sm text-muted-foreground">{user?.email ?? 'No email'}</p>
                             <div className="mt-2 flex items-center gap-2">
                                <Badge variant="outline" className="capitalize">
                                    {user?.role ? roleDisplayNames[user.role] : 'Sales'}
                                </Badge>
                                {user?.role === 'sales' && user.team && (
                                    <Badge variant="secondary">{user.team}</Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <Separator />
                
                <div className="p-2">
                    <DialogTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start text-sm font-normal">
                            <User className="mr-2 h-4 w-4" />
                            View Profile
                        </Button>
                    </DialogTrigger>
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start text-sm font-normal">
                                <Award className="mr-2 h-4 w-4" />
                                My Achievements
                            </Button>
                        </DialogTrigger>
                        <AchievementsDialogContent />
                    </Dialog>
                    <PayoutHistoryDialog>
                      <Button variant="ghost" className="w-full justify-start text-sm font-normal">
                          <Receipt className="mr-2 h-4 w-4" />
                          Payout History
                      </Button>
                    </PayoutHistoryDialog>
                    <Button variant="ghost" className="w-full justify-start text-sm font-normal" asChild>
                        <Link href="/dashboard/settings">
                            <Settings className="mr-2 h-4 w-4" />
                            Account Settings
                        </Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-sm font-normal">
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Help & Support
                    </Button>
                </div>

                <Separator />
                
                <div className="p-2">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-sm font-normal text-destructive hover:bg-destructive/10"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                    </Button>
                </div>

            </PopoverContent>
          </Popover>
           <ProfileDialogContent />
        </Dialog>
      </div>
    </header>
  );
}
