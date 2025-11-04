import type { ReactNode } from "react";
import { FirebaseClientProvider } from "@/firebase";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  // This layout is intentionally simple. It only provides the Firebase context
  // needed for the onboarding pages to function without any of the dashboard's
  // complex authentication and redirection logic.
  return (
    <FirebaseClientProvider>
      <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
        {children}
      </main>
    </FirebaseClientProvider>
  );
}
