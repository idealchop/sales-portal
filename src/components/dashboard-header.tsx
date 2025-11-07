
'use client';
import Link from 'next/link';
import { Bell, User, Calendar as CalendarIcon, Upload, LogOut, Settings, HelpCircle, Star, Percent, CreditCard, ChevronRight, Users, Trash2, Edit, X, Loader2, Award } from 'lucide-react';
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
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { useProposals } from '@/hooks/use-proposals';
import { useClients } from '@/hooks/use-clients';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';


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

    const achievements = useMemo(() => {
        const corporateBonusTiers = [
            { target: 3, name: 'Corporate Closer I', bonus: '₱2,000' },
            { target: 5, name: 'Corporate Closer II', bonus: '₱5,000' },
            { target: 10, name: 'Corporate Closer III', bonus: '₱12,000' },
        ];
        const familyBonusTiers = [
            { target: 10, name: 'Family Plan Closer I', bonus: '₱2,500' },
            { target: 20, name: 'Family Plan Closer II', bonus: '₱6,000' },
            { target: 30, name: 'Family Plan Closer III', bonus: '₱15,000' },
        ];

        const acceptedProposals = proposals
            .filter(p => p.status === 'accepted' && p.createdAt)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        const monthlyAchievements: {
            corporate: { [key: string]: { client: string; date: string; }[] };
            household: { [key: string]: { client: string; date: string; }[] };
        } = { corporate: {}, household: {} };

        for (const proposal of acceptedProposals) {
            const client = clientMap.get(proposal.clientId);
            if (!client) continue;

            const monthYear = format(new Date(proposal.createdAt), 'MMMM yyyy');

            if (['sme', 'commercial', 'corporate', 'enterprise'].includes(client.clientType || '')) {
                if (!monthlyAchievements.corporate[monthYear]) {
                    monthlyAchievements.corporate[monthYear] = [];
                }
                monthlyAchievements.corporate[monthYear].push({ client: client.companyName, date: proposal.createdAt });
            } else if (client.clientType === 'household') {
                if (!monthlyAchievements.household[monthYear]) {
                    monthlyAchievements.household[monthYear] = [];
                }
                monthlyAchievements.household[monthYear].push({ client: client.companyName, date: proposal.createdAt });
            }
        }

        const unlocked: { name: string; bonus: string; client: string; date: string }[] = [];

        Object.keys(monthlyAchievements.corporate).forEach(month => {
            const clientsInMonth = monthlyAchievements.corporate[month];
            corporateBonusTiers.forEach(tier => {
                if (clientsInMonth.length >= tier.target) {
                    const achievingClient = clientsInMonth[tier.target - 1];
                    unlocked.push({
                        name: tier.name,
                        bonus: tier.bonus,
                        client: achievingClient.client,
                        date: achievingClient.date,
                    });
                }
            });
        });
        
        Object.keys(monthlyAchievements.household).forEach(month => {
            const clientsInMonth = monthlyAchievements.household[month];
            familyBonusTiers.forEach(tier => {
                if (clientsInMonth.length >= tier.target) {
                    const achievingClient = clientsInMonth[tier.target - 1];
                    unlocked.push({
                        name: tier.name,
                        bonus: tier.bonus,
                        client: achievingClient.client,
                        date: achievingClient.date,
                    });
                }
            });
        });

        return unlocked.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [proposals, clients, clientMap]);

    if (proposalsLoading || clientsLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>My Achievement History</DialogTitle>
                <DialogDescription>
                    A log of all the bonuses and milestones you've unlocked.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Achievement</TableHead>
                            <TableHead>Bonus</TableHead>
                            <TableHead>Unlocked via Client</TableHead>
                            <TableHead className="text-right">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {achievements.length > 0 ? (
                            achievements.map((ach, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <div className="font-medium">{ach.name}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-semibold">{ach.bonus}</Badge>
                                    </TableCell>
                                    <TableCell>{ach.client}</TableCell>
                                    <TableCell className="text-right">{format(new Date(ach.date), 'PPP')}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No achievements unlocked yet. Keep closing deals!
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
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

export function DashboardHeader() {
  const { user } = useUser();
  const referralLink = "https://smartrefill.app/referral?code=SR12345";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(referralLink)}&size=200x200&bgcolor=F1F8E9`;
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
                    <AvatarImage src={user?.photoURL ?? `https://picsum.photos/seed/${user?.uid}/32/32`} alt="User Avatar" />
                    <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                </Avatar>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="p-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={user?.photoURL ?? `https://picsum.photos/seed/${user?.uid}/48/48`} alt="User Avatar" />
                            <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-base font-semibold leading-none">{user?.displayName ?? 'Sales Rep'}</p>
                            <p className="text-sm text-muted-foreground">{user?.email ?? 'No email'}</p>
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
                    <Button variant="ghost" className="w-full justify-start text-sm font-normal" asChild>
                        <Link href="/dashboard/settings">
                            <Settings className="mr-2 h-4 w-4" />
                            Account Settings
                        </Link>
                    </Button>
                    <Dialog>
                        <DialogTrigger asChild>
                             <Button variant="ghost" className="w-full justify-start text-sm font-normal">
                                <QrCodeIcon className="mr-2 h-4 w-4" />
                                Refer a Friend
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

    
