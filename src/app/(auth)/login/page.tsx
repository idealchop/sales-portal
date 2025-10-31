'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Lock } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full">
        <Image
            src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FSales%20Mats.jpg?alt=media&token=455c3120-2c77-4163-9c30-af7f186682d9"
            alt="Smart Refill sales team"
            fill
            className="object-cover"
            data-ai-hint="sales team"
        />
        <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px]"></div>

        <div className="relative z-10 flex min-h-screen items-center justify-start">
            <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-r-2xl p-8 shadow-2xl md:p-12">
                <div className="mb-8 text-center">
                    <div className="flex justify-center mb-4">
                        <Logo />
                    </div>
                    <h1 className="text-2xl font-bold">Smart Refill Sales Portal</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Please enter your credentials to log in.</p>
                </div>

                <div className="grid gap-4">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="username" type="text" placeholder="Username" className="pl-10" />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="Password" className="pl-10" />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-primary to-[#3ab7b1] hover:from-primary/90 hover:to-[#36a6a0] text-primary-foreground font-bold">
                    Login Now
                  </Button>
                </div>
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
    </div>
  );
}
