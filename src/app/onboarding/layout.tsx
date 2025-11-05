import type { ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  // This layout is intentionally simple. It uses the global FirebaseProvider
  // from the root layout, so it doesn't need its own.
  return (
      <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
        {children}
      </main>
  );
}
