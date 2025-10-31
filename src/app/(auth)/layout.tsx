import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-4">
        {children}
      </div>
    </main>
  );
}
