
import { FirebaseClientProvider } from "@/firebase";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <main className="min-h-screen w-full">
        {children}
      </main>
    </FirebaseClientProvider>
  );
}
