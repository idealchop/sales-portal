
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
      <main className="min-h-screen w-full flex items-center justify-center bg-muted/40 p-4">
        {children}
      </main>
  );
}
