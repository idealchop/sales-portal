
import type { ReactNode } from "react";
import { FirebaseClientProvider } from "@/firebase";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
        {children}
      </main>
    </FirebaseClientProvider>
  );
}
