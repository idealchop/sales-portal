import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  // This layout is intentionally simple. It uses the global FirebaseProvider
  // from the root layout, so it doesn't need its own.
  return (
      <main className="min-h-screen w-full flex items-center justify-center bg-muted/40 p-4">
        {children}
      </main>
  );
}
