
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUser } from '@/firebase';
import { useSalesUsers } from '@/hooks/use-sales-users';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Loader2, User, Calendar as CalendarIcon, Phone, Upload, Trash2, Briefcase, MapPin, Users, Building, ChevronsRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Suspense } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';

const formSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters.'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters.'),
  phone: z.string().min(10, 'Please enter a valid mobile number.'),
  birthday: z.date({
    required_error: "Your date of birth is required.",
  }),
  role: z.enum(['sales', 'manager'], {
    required_error: "You must select a role."
  }),
  location: z.string().optional(),
  team: z.string().optional(),
}).refine(data => {
    if (data.role === 'manager') return !!data.location;
    return true;
}, {
    message: "Location is required for managers.",
    path: ["location"],
}).refine(data => {
    if (data.role === 'sales') return !!data.team;
    return true;
}, {
    message: "Team is required for sales executives.",
    path: ["team"],
});

type FormValues = z.infer<typeof formSchema>;

function ProfileSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading } = useUser();
  const { salesUsers, isLoading: isSalesUsersLoading } = useSalesUsers();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: searchParams.get('phone') || '',
      birthday: searchParams.get('birthday') ? new Date(searchParams.get('birthday')!) : undefined,
    },
  });

  const selectedRole = form.watch('role');

  const managers = useMemo(() => {
    return salesUsers.filter(u => u.role === 'manager' && u.location);
  }, [salesUsers]);
  
  const locations = useMemo(() => {
    const managerLocations = managers.map(m => m.location).filter((l): l is string => !!l);
    return Array.from(new Set(managerLocations)).map(loc => ({ label: loc, value: loc }));
  }, [managers]);


  useEffect(() => {
    const displayName = searchParams.get('displayName') || user?.displayName;
    if (displayName) {
        const nameParts = displayName.split(' ');
        const firstName = nameParts.slice(0, -1).join(' ');
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        form.setValue('firstName', firstName || (nameParts.length === 1 ? nameParts[0] : ''));
        form.setValue('lastName', lastName || '');
    }
  }, [user, searchParams, form]);

  useEffect(() => {
    if (user?.photoURL) {
      setPhotoPreview(user.photoURL);
    }
  }, [user]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoFile(null);
    setPhotoPreview(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    if (isUserLoading || !user || !user.uid) {
        toast({
            variant: 'destructive',
            title: 'Authentication Incomplete',
            description: 'Your user session is not fully ready. Please wait a moment and try again.',
        });
        setIsSubmitting(false);
        return;
    }

    const displayName = `${values.firstName} ${values.lastName}`.trim();
    const params = new URLSearchParams(searchParams.toString());
    params.set('displayName', displayName);
    params.set('phone', values.phone);
    params.set('birthday', values.birthday.toISOString());
    params.set('role', values.role);
    if (values.role === 'manager' && values.location) {
        params.set('location', values.location);
        params.delete('team');
    }
    if (values.role === 'sales' && values.team) {
        params.set('team', values.team);
        params.delete('location');
    }

    params.delete('photoURL');

    try {
      if (photoFile) {
        const storage = getStorage();
        const filePath = `user-avatars/${user.uid}/${photoFile.name}`;
        const storageRef = ref(storage, filePath);
        const snapshot = await uploadBytes(storageRef, photoFile);
        const downloadURL = await getDownloadURL(snapshot.ref);
        params.set('photoURL', downloadURL);
      } else if (photoPreview) {
        params.set('photoURL', photoPreview);
      } else if (!photoPreview && user?.photoURL) {
        const storage = getStorage();
        const photoRef = ref(storage, user.photoURL);
        try {
            await deleteObject(photoRef);
        } catch (error: any) {
            if (error.code !== 'storage/object-not-found') {
                console.warn("Could not delete old photo:", error);
            }
        }
      }

      router.push(`/onboarding/password?${params.toString()}`);

    } catch (error) {
      console.error("Error during profile submission:", error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'An error occurred while saving your profile. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  const isLoading = isUserLoading || isSalesUsersLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  const getInitials = (firstName: string, lastName: string) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`;
    if (firstName) return firstName[0];
    if (lastName) return lastName[0];
    return user?.email?.[0].toUpperCase() || 'U';
  }

  const handleRoleSelect = (role: 'manager' | 'sales') => {
    form.setValue('role', role, { shouldValidate: true });
    // Reset the other field when role changes
    if (role === 'manager') {
      form.setValue('team', undefined);
    } else {
      form.setValue('location', undefined);
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Logo />
        </div>
        <CardTitle>Step 1: Complete Your Profile</CardTitle>
        <CardDescription>
          Just a few more details to get your account ready.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="h-32 w-32 cursor-pointer" onClick={handleAvatarClick}>
                  <AvatarImage src={photoPreview || undefined} alt="User Avatar" className="object-cover" />
                  <AvatarFallback className="text-4xl">{getInitials(form.watch('firstName'), form.watch('lastName'))}</AvatarFallback>
                </Avatar>
                <div 
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                >
                  <Upload className="h-8 w-8 text-white" />
                </div>
                {photoPreview && (
                  <button 
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-2 -right-2 h-8 w-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:bg-destructive/90 transition-all"
                    aria-label="Remove photo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/gif"
              />
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="e.g., John" {...field} className="pl-10" />
                            </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="e.g., Doe" {...field} className="pl-10" />
                            </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Mobile Number</FormLabel>
                            <FormControl>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="(0917) 123 4567" {...field} className="pl-10" />
                            </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="birthday"
                        render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Date of birth</FormLabel>
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                    )}
                                >
                                    {field.value ? (
                                    format(field.value, "PPP")
                                    ) : (
                                    <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                captionLayout="dropdown-buttons"
                                fromYear={new Date().getFullYear() - 80}
                                toYear={new Date().getFullYear() - 18}
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                                />
                            </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4">
                  <FormLabel>What is your role?</FormLabel>
                  <AnimatePresence>
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        {!selectedRole && (
                          <>
                            <Card className={cn("cursor-pointer hover:border-primary", form.watch('role') === 'manager' && 'border-primary ring-2 ring-primary')} onClick={() => handleRoleSelect('manager')}>
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <Briefcase className="h-8 w-8 text-primary"/>
                                    <div>
                                        <CardTitle className="text-lg">Sales Manager</CardTitle>
                                        <CardDescription>I manage a sales team.</CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                             <Card className={cn("cursor-pointer hover:border-primary", form.watch('role') === 'sales' && 'border-primary ring-2 ring-primary')} onClick={() => handleRoleSelect('sales')}>
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <User className="h-8 w-8 text-primary"/>
                                    <div>
                                        <CardTitle className="text-lg">Sales Executive</CardTitle>
                                        <CardDescription>I am part of a sales team.</CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                          </>
                        )}

                        {selectedRole === 'manager' && (
                           <motion.div
                                key="manager"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="md:col-span-2"
                            >
                                <Card className="border-primary ring-2 ring-primary">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Briefcase className="h-8 w-8 text-primary"/>
                                            <div>
                                                <CardTitle className="text-lg">Sales Manager</CardTitle>
                                                <CardDescription>I manage a sales team.</CardDescription>
                                            </div>
                                        </div>
                                         <Button variant="ghost" size="sm" onClick={() => form.setValue('role', undefined)}>Change Role</Button>
                                    </CardHeader>
                                    <CardContent>
                                        <FormField
                                            control={form.control}
                                            name="location"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Location</FormLabel>
                                                    <FormControl>
                                                        <Combobox
                                                            options={locations}
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                            placeholder="Select or create a location..."
                                                            searchPlaceholder="Search locations..."
                                                            noResultsText="No locations found. You can create a new one."
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                           </motion.div>
                        )}
                        {selectedRole === 'sales' && (
                             <motion.div
                                key="sales"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="md:col-span-2"
                            >
                                <Card className="border-primary ring-2 ring-primary">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                         <div className="flex items-center gap-4">
                                            <User className="h-8 w-8 text-primary"/>
                                            <div>
                                                <CardTitle className="text-lg">Sales Executive</CardTitle>
                                                <CardDescription>I am part of a sales team.</CardDescription>
                                            </div>
                                        </div>
                                         <Button variant="ghost" size="sm" onClick={() => form.setValue('role', undefined)}>Change Role</Button>
                                    </CardHeader>
                                    <CardContent>
                                        <FormField
                                            control={form.control}
                                            name="team"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Team</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <div className="flex items-center gap-2">
                                                                     <Users className="h-4 w-4 text-muted-foreground" />
                                                                     <SelectValue placeholder="Select your team" />
                                                                </div>
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {managers.length > 0 ? (
                                                                managers.map(manager => (
                                                                    <SelectItem key={manager.id} value={`${manager.location} (${manager.displayName})`}>
                                                                        {manager.location} ({manager.displayName})
                                                                    </SelectItem>
                                                                ))
                                                            ) : (
                                                                <div className="p-4 text-center text-sm text-muted-foreground">No managers found.</div>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                           </motion.div>
                        )}
                    </motion.div>
                  </AnimatePresence>
                </div>
            </div>
            <CardFooter className="px-0 pt-8">
                <Button type="submit" className="w-full bg-gradient-to-r from-primary to-[#3ab7b1] hover:from-primary/90 hover:to-[#36a6a0] text-primary-foreground font-bold transition-all" disabled={isSubmitting || !selectedRole}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Saving...' : 'Save and Proceed'}
                </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function ProfileSetupPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProfileSetupContent />
        </Suspense>
    )
}
