
'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useAuth, useUser, useFirestore, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { isFirebaseLoading } = useFirebase();
  const { user: authUser, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // This effect handles users who are already logged in and might land here.
  useEffect(() => {
    if (!isUserLoading && authUser) {
      router.push('/dashboard');
    }
  }, [authUser, isUserLoading, router]);

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoggingIn(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      if (user) {
        const userDocRef = doc(firestore, 'sales', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            id: user.uid,
            email: user.email,
            displayName: user.email,
            onboardingCompleted: false,
            role: 'sales',
            createdAt: serverTimestamp()
          });
        }
      }
      
      router.push('/onboarding/profile'); 
    } catch (error) {
      let description = 'An unexpected error occurred. Please try again.';
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            description = 'Invalid email or password. Please try again.';
            break;
          default:
            description = "An error occurred during login. Please check the console for details.";
            console.error("Firebase Auth Error:", error.message);
        }
      }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description,
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const isFormDisabled = isFirebaseLoading || isUserLoading || isLoggingIn;

  if (isFirebaseLoading || isUserLoading || authUser) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
      );
  }

  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2">
        <div className="flex items-center justify-center p-8">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="flex justify-center mb-4">
                        <Logo />
                    </div>
                    <h1 className="text-2xl font-bold">Smart Refill Sales Portal</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Please enter your credentials to log in.</p>
                </div>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                    <fieldset disabled={isFormDisabled} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <FormControl>
                                <Input type="email" placeholder="Email Address" className="pl-10" {...field} />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <FormControl>
                                <Input type={showPassword ? 'text' : 'password'} placeholder="Password" className="pl-10 pr-10" {...field} />
                              </FormControl>
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                                  {showPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                              </button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </fieldset>
                    <Button type="submit" className="w-full bg-gradient-to-r from-primary to-[#3ab7b1] hover:from-primary/90 hover:to-[#36a6a0] text-primary-foreground font-bold" disabled={isFormDisabled}>
                      {isFormDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Login Now
                    </Button>
                  </form>
                </Form>
            </div>
        </div>
        <div className="relative hidden md:block">
            <Image
                src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FSales_Mats_v3.png?alt=media&token=5e2fc62e-0082-4c37-9078-e1cf5e188635"
                alt="Smart Refill sales team"
                fill
                className="object-contain"
                data-ai-hint="sales team"
            />
        </div>
    </div>
  );
}
