"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AddUserForm({
  onCreate,
}: {
  onCreate: (input: {
    email: string;
    displayName: string;
    password: string;
  }) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await onCreate({ email, displayName, password });
      setMessage(`${displayName || email} was created. Scroll down to assign app access.`);
      setEmail("");
      setDisplayName("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create user.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-5 w-5 text-[var(--primary)]" />
          Add a new user
        </CardTitle>
        <CardDescription>
          Creates their login account. You can assign apps and roles in the
          section below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="grid gap-4 md:grid-cols-2"
        >
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Full name</span>
            <input
              type="text"
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Maria Santos"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2.5"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Work email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="maria@company.com"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2.5"
            />
          </label>
          <label className="space-y-1.5 text-sm md:col-span-2">
            <span className="font-medium text-foreground">Temporary password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2.5"
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Share this once. They should change it after first sign-in.
            </p>
          </label>
          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </div>
        </form>
        {message && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
