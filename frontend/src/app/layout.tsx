import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BRAND_LOGO } from "@/components/logo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Refill Sales Portal",
  description: "B2B sales management for the Smart Refill team",
  icons: {
    icon: BRAND_LOGO.black,
    apple: BRAND_LOGO.black,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
