
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';


export const metadata: Metadata = {
  title: {
    default: "Smart Refill Sales Portal",
    template: "%s | Smart Refill",
  },
  description: 'The official sales portal for Smart Refill. Manage clients, create proposals, and track commissions for the Philippines’ first automated water refill system.',
  keywords: ["Smart Refill", "sales portal", "B2B sales", "water refill system", "automated delivery", "Philippines"],
  openGraph: {
    title: "Smart Refill Sales Portal",
    description: "Manage clients, create proposals, and track commissions.",
    url: "https://admin.smartrefill.io",
    siteName: "Smart Refill Sales Portal",
    images: [
      {
        url: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FSales_Mats_v3.png?alt=media&token=5e2fc62e-0082-4c37-9078-e1cf5e188635",
        width: 1200,
        height: 630,
        alt: "Smart Refill Sales Team",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart Refill Sales Portal",
    description: "The official sales portal for Smart Refill.",
    images: ["https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FSales_Mats_v3.png?alt=media&token=5e2fc62e-0082-4c37-9078-e1cf5e188635"],
  },
  icons: {
    icon: '/favicon_200x200.png',
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
