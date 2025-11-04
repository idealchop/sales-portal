
import { FirebaseClientProvider } from "@/firebase";
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <main className="min-h-screen w-full">
        {children}
        <FirebaseErrorListener />
      </main>
    </FirebaseClientProvider>
  );
}
