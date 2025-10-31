'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Lock } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="w-full p-8 md:w-1/2 lg:p-12 flex flex-col justify-center">
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
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
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
