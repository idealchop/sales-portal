import type { ReactNode } from "react";

export default function ProposalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-zinc-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl">{children}</div>
    </main>
  );
}
