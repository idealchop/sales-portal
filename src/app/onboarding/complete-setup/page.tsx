
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
import { Loader2, User, Calendar, Briefcase, CheckCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FirebaseError } from 'firebase/app';
import { format } from 'date-fns';

function CompleteSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [status, setStatus] = useState<'idle' | 'finalizing' | 'success'>('idle');


  // Extract all data from URL
  const displayName = searchParams.get('displayName');
  const team = searchParams.get('team');
  const birthdayStr = searchParams.get('birthday');
  const currentPassword = searchParams.get('currentPassword');
  const newPassword = searchParams.get('newPassword');

  const birthday = birthdayStr ? new Date(birthdayStr) : null;

  useEffect(() => {
    // A simple check to ensure we came from the previous steps
    if (!isUserLoading && (!displayName || !currentPassword || !newPassword)) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please complete the previous onboarding steps.',
      });
      router.push('/onboarding/profile');
    }
  }, [isUserLoading, displayName, currentPassword, newPassword, router, toast]);

  const handleFinalize = async () => {
    if (!user || !user.email || !displayName || !team || !birthday || !currentPassword || !newPassword) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Information',
        description: 'Onboarding data is missing. Please start over.',
      });
      router.push('/onboarding/profile');
      return;
    }

    setStatus('finalizing');
    try {
      // 1. Re-authenticate the user first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // 2. Now, update the password
      await updatePassword(user, newPassword);
      
      // 3. Update Firebase Auth profile displayName
      await updateProfile(user, { displayName });

      // 4. Create the Firestore document and WAIT for it to complete.
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        id: user.uid,
        email: user.email,
        displayName: displayName,
        team: team,
        birthday: birthday.toISOString(),
        role: 'sales', // Default role
        onboardingCompleted: true,
      });
      
      setStatus('success');
      
      toast({
        title: 'Setup Complete!',
        description: 'Your account has been created. Welcome to Smart Refill!',
      });
      
      // 5. Redirect only after all operations are successful.
      setTimeout(() => {
          router.push('/dashboard');
      }, 2000);


    } catch (error) {
      console.error("Finalization Error:", error);
      let description = "An unexpected error occurred. Please try again.";
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            description = "The current password you entered is incorrect. Please go back and try again.";
            // Go back to the password page, preserving other details
            const params = new URLSearchParams(searchParams.toString());
            // It is important to remove the password fields from the URL before redirecting
            params.delete('currentPassword');
            params.delete('newPassword');
            toast({
                variant: 'destructive',
                title: 'Incorrect Password',
                description: "The 'Current Password' you entered was incorrect. Please try again.",
            });
            router.push(`/onboarding/password?${params.toString()}`);
            return; // Stop execution here
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
                <AvatarFallback className="text-3xl">
                    {displayName?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold">{displayName}</h2>
        </div>
         <div className="space-y-4 text-sm text-center">
            <div className="flex items-center justify-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Team:</span>
                <span className="font-semibold">{team}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Birthday:</span>
                <span className="font-semibold">{birthday ? format(birthday, "PPP") : 'N/A'}</span>
            </div>
        </div>
      </CardContent>
      <CardFooter>
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
