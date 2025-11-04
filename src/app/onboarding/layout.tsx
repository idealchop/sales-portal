
import type { ReactNode } from "react";
import { FirebaseClientProvider } from "@/firebase";
import DashboardLayout from "../dashboard/layout";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
        {/* We wrap with DashboardLayout to leverage its authentication logic */}
        <DashboardLayout>
            <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
                {children}
            </main>
        </DashboardLayout>
    </FirebaseClientProvider>
  );
}
