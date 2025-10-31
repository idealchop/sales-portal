'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Lock } from 'lucide-react';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
        <path d="M12 15a6 6 0 0 0 6-6H6a6 6 0 0 1 6 6z"/>
        <path d="M12 15v-3a3 3 0 0 0-3 3h3zm0 0a3 3 0 0 0 3-3h-3v3z"/>
    </svg>
);

const FacebookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
);

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="w-full p-8 md:w-1/2 lg:p-12">
        <h1 className="text-2xl font-bold">LOGIN</h1>
        <p className="mt-2 text-sm text-muted-foreground">How do I get started lorem ipsum dolor at?</p>

        <div className="mt-8 grid gap-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input id="username" type="text" placeholder="Username" className="pl-10" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input id="password" type="password" placeholder="Password" className="pl-10" />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
            Login Now
          </Button>
        </div>

        <div className="my-8 flex items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-4 flex-shrink text-sm text-muted-foreground">Login with Others</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <div className="grid gap-4">
          <Button variant="outline" className="w-full justify-start">
            <GoogleIcon />
            <span className="ml-4">Login with Google</span>
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <FacebookIcon />
            <span className="ml-4">Login with Facebook</span>
          </Button>
        </div>

        <div className="mt-8 text-center text-sm">
          <p>Don&apos;t have an account? <Link href="#" className="font-medium text-primary hover:underline">Register</Link></p>
        </div>
      </div>
      <div className="relative hidden w-1/2 items-center justify-center bg-primary md:flex">
        <div className="relative h-full w-full">
            <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px]"></div>
            <Image
                src="https://picsum.photos/seed/login/800/1000"
                alt="Woman using a tablet"
                fill
                className="object-cover"
                data-ai-hint="woman tablet"
            />
             <div className="absolute inset-0 bg-gradient-to-t from-primary/50 to-transparent"></div>
        </div>
      </div>
    </div>
  );
}
