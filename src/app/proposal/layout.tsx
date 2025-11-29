
import type { ReactNode } from "react";

export default function ProposalLayout({ children }: { children: ReactNode }) {
  // This layout provides a simple, unauthenticated wrapper for the public proposal creation flow.
  return (
      <main className="min-h-screen w-full flex items-center justify-center bg-muted/40 p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-6xl">
            {children}
          </div>
      </main>
  );
}
