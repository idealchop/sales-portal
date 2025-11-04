
'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Lock, Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { FirebaseError } from 'firebase/app';
import { useEffect, useState } from 'react';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      await initiateEmailSignIn(auth, values.email, values.password);
      // The onAuthStateChanged listener in the provider will handle the redirect
      // but we can optimistically navigate.
      router.push('/dashboard');
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
            description = error.message;
        }
      }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // A slight modification to the non-blocking login. We will use onAuthStateChanged
  // to handle sign-in errors, as it's the most reliable way.
   useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        router.push('/dashboard');
      }
    });

    const errorUnsubscribe = auth.onIdTokenChanged(undefined, (error) => {
      if (error) {
        setIsLoading(false);
        let description = 'An unexpected error occurred. Please try again.';
        if (error instanceof FirebaseError) {
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    description = 'Invalid email or password. Please try again.';
                    break;
                default:
                    description = error.message;
            }
        }
         toast({
            variant: 'destructive',
            title: 'Login Failed',
            description,
        });
      }
    });

    return () => {
        unsubscribe();
        errorUnsubscribe();
    };
  }, [auth, router, toast]);

  const handleLogin = (values: LoginFormValues) => {
      setIsLoading(true);
      initiateEmailSignIn(auth, values.email, values.password);
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
                  <form onSubmit={form.handleSubmit(handleLogin)} className="grid gap-4">
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
                              <Input type="password" placeholder="Password" className="pl-10" {...field} />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full bg-gradient-to-r from-primary to-[#3ab7b1] hover:from-primary/90 hover:to-[#36a6a0] text-primary-foreground font-bold" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Login Now
                    </Button>
                  </form>
                </Form>

                <div className="mt-8 text-center text-sm">
                  <p className="text-muted-foreground">
                    By continuing, you agree to our{' '}
                    <Link href="#" className="underline underline-offset-4 hover:text-primary">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="#" className="underline underline-offset-4 hover:text-primary">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
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
