
'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUser } from '@/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Loader2, User, Calendar as CalendarIcon, Phone, Upload, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Suspense } from 'react';

const formSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters.'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters.'),
  phone: z.string().min(10, 'Please enter a valid mobile number.'),
  birthday: z.date({
    required_error: "Your date of birth is required.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

function ProfileSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading } = useUser();
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
  
  useEffect(() => {
    // Populate form with existing data from searchParams or user profile
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
    e.stopPropagation(); // Prevent triggering the file input
    setPhotoFile(null);
    setPhotoPreview(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    if (isUserLoading) {
        toast({
            variant: 'destructive',
            title: 'Please Wait',
            description: 'Authentication is still in progress. Please try again in a moment.',
        });
        setIsSubmitting(false);
        return;
    }

    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'You must be logged in to update your profile. Redirecting to login.',
        });
        router.push('/login');
        return;
    }

    const displayName = `${values.firstName} ${values.lastName}`.trim();
    const params = new URLSearchParams(searchParams.toString());
    params.set('displayName', displayName);
    params.set('phone', values.phone);
    params.set('birthday', values.birthday.toISOString());
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
        // Photo was pre-existing and not removed
        params.set('photoURL', photoPreview);
      } else if (!photoPreview && user?.photoURL) {
        // Photo was removed
        const storage = getStorage();
        const photoRef = ref(storage, user.photoURL);
        try {
            await deleteObject(photoRef);
        } catch (error: any) {
            // Ignore if file doesn't exist, as it might have been deleted already.
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

  if (isUserLoading) {
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
            </div>
            <CardFooter className="px-0 pt-4">
                <Button type="submit" className="w-full bg-gradient-to-r from-primary to-[#3ab7b1] hover:from-primary/90 hover:to-[#36a6a0] text-primary-foreground font-bold transition-all" disabled={isSubmitting}>
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
