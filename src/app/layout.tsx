
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';


export const metadata: Metadata = {
  title: 'Smart Refill Sales Portal',
  description: 'Your intelligent sales partner.',
  icons: {
    icon: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Brand%20Logo%2Ffavicon_200x200.png?alt=media&token=d502924c-8360-4523-972d-a80720f9d966',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
