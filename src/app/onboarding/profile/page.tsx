
'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUser, useAuth } from '@/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Upload, User, Calendar as CalendarIcon, Phone, Edit2, Briefcase } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters.'),
  team: z.string().min(1, 'Please enter your team name.'),
  phone: z.string().min(10, 'Please enter a valid mobile number.'),
  birthday: z.date({
    required_error: "Your date of birth is required.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProfileSetupPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: '',
      team: '',
      phone: '',
    },
  });
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    }
  }
  
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  }

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    const params = new URLSearchParams();
    params.append('displayName', values.displayName);
    params.append('team', values.team);
    params.append('phone', values.phone);
    params.append('birthday', values.birthday.toISOString());

    if (photoFile && user) {
        const storage = getStorage();
        const filePath = `user-avatars/${user.uid}/${photoFile.name}`;
        const storageRef = ref(storage, filePath);
        
        try {
            const snapshot = await uploadBytes(storageRef, photoFile);
            const downloadURL = await getDownloadURL(snapshot.ref);
            params.append('photoURL', downloadURL);
        } catch (error) {
            console.error("Error uploading photo:", error);
            toast({
                variant: 'destructive',
                title: 'Photo Upload Failed',
                description: 'Could not upload your profile picture. Please try again.'
            });
            setIsSubmitting(false);
            return;
        }
    } else if (user?.photoURL) {
        params.append('photoURL', user.photoURL);
    }

    router.push(`/onboarding/password?${params.toString()}`);
  };

  if (isUserLoading) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
    );
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                    <Avatar className="h-32 w-32 cursor-pointer" onClick={handleAvatarClick}>
                        <AvatarImage src={photoPreview || user?.photoURL || undefined} alt="User Avatar" />
                        <AvatarFallback className="text-4xl"><User className="h-12 w-12" /></AvatarFallback>
                    </Avatar>
                     <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={handleAvatarClick}>
                        <Edit2 className="h-8 w-8 text-white" />
                    </div>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif"
                />
                <Button type="button" variant="outline" onClick={handleAvatarClick}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g., John Doe" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="team"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Team</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g., Team Alpha" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-[#3ab7b1] hover:from-primary/90 hover:to-[#36a6a0] text-primary-foreground font-bold transition-all" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Saving...' : 'Save and Proceed'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
 