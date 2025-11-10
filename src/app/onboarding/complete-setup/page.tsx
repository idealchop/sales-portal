
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, User, Calendar, Briefcase, CheckCircle, Phone } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FirebaseError } from 'firebase/app';
import { format } from 'date-fns';
import Link from 'next/link';

function CompleteSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [status, setStatus] = useState<'idle' | 'finalizing' | 'success'>('idle');


  const displayName = searchParams.get('displayName');
  const team = searchParams.get('team');
  const birthdayStr = searchParams.get('birthday');
  const phone = searchParams.get('phone');
  const photoURL = searchParams.get('photoURL');
  const currentPassword = searchParams.get('currentPassword');
  const newPassword = searchParams.get('newPassword');

  const birthday = birthdayStr ? new Date(birthdayStr) : null;

  useEffect(() => {
    if (!isUserLoading && (!displayName || !currentPassword || !newPassword || !phone)) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please complete the previous onboarding steps.',
      });
      router.push('/onboarding/profile');
    }
  }, [isUserLoading, displayName, currentPassword, newPassword, phone, router, toast]);

  const handleFinalize = async () => {
    if (!auth.currentUser || !displayName || !birthday || !phone || !currentPassword || !newPassword) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Information',
        description: 'Onboarding data is missing. Please start over.',
      });
      router.push('/onboarding/profile');
      return;
    }

    const liveUser = auth.currentUser;

    setStatus('finalizing');
    try {
      const credential = EmailAuthProvider.credential(liveUser.email!, currentPassword);
      await reauthenticateWithCredential(liveUser, credential);

      await updatePassword(liveUser, newPassword);
      
      await updateProfile(liveUser, { displayName, photoURL: photoURL || null });

      const userDocRef = doc(firestore, 'sales', liveUser.uid);
      await setDoc(userDocRef, {
        displayName: displayName,
        phone: phone,
        team: team || 'Default Team', // Add a default team if not provided
        birthday: birthday.toISOString(),
        photoURL: photoURL || null,
        role: 'sales',
        onboardingCompleted: true,
      }, { merge: true });
      
      setStatus('success');
      
      toast({
        title: 'Setup Complete!',
        description: 'Your account has been created. Welcome to Smart Refill!',
      });
      
      setTimeout(() => {
          router.push('/dashboard');
      }, 2000);


    } catch (error) {
      console.error("Finalization Error:", error);
      let description = "An unexpected error occurred. Please try again.";
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            description = "The current password you entered is incorrect. Please go back and try again.";
            const params = new URLSearchParams(searchParams.toString());
            params.delete('currentPassword');
            params.delete('newPassword');
            toast({
                variant: 'destructive',
                title: 'Incorrect Password',
                description: "The 'Current Password' you entered was incorrect. Please try again.",
            });
            router.push(`/onboarding/password?${params.toString()}`);
            return;
        } else {
            description = error.message;
        }
      }
      toast({
        variant: 'destructive',
        title: 'An Error Occurred',
        description: description,
      });
      setStatus('idle');
    }
  };
  
  const getInitials = (name: string | null) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('');
  }
  
  const prevLink = `/onboarding/password?${searchParams.toString()}`;


  if (isUserLoading || !displayName) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
    );
  }
  
  if (status === 'success') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Logo />
            </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center space-y-4 py-12">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">Setup Complete!</h2>
            <p className="text-muted-foreground">Welcome, {displayName}. You will be redirected to your dashboard shortly.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
            <Logo />
        </div>
        <CardTitle>Step 3: Confirm Your Details</CardTitle>
        <CardDescription>
          Review your information and complete the setup process.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
                <AvatarImage src={photoURL || undefined} />
                <AvatarFallback className="text-3xl">
                    {getInitials(displayName)}
                </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold">{displayName}</h2>
        </div>
         <div className="space-y-4 text-sm text-center">
             <div className="flex items-center justify-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Mobile:</span>
                <span className="font-semibold">{phone}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Birthday:</span>
                <span className="font-semibold">{birthday ? format(birthday, "PPP") : 'N/A'}</span>
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button onClick={handleFinalize} className="w-full" disabled={status === 'finalizing'}>
            {status === 'finalizing' ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalizing Your Account...
                </>
            ) : (
                'Complete Setup & Go to Dashboard'
            )}
        </Button>
         <Button variant="link" asChild className="w-full">
            <Link href={prevLink}>Go Back</Link>
          </Button>
      </CardFooter>
    </Card>
  );
}

export default function CompleteSetupPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CompleteSetupContent />
        </Suspense>
    )
}
