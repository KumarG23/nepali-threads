"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Props {
  token: string;
}

export function ResetPasswordForm({ token }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="font-sans text-body text-brand-red-700" role="alert">
          This reset link is missing or invalid. Request a fresh one.
        </p>
        <p>
          <Link
            href="/forgot-password"
            className="text-brand-red-600 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded font-sans"
          >
            ← Request a new link
          </Link>
        </p>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password needs at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/customers/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        setError(
          "Couldn't reset your password. The link may have expired — request a fresh one."
        );
        setLoading(false);
        return;
      }

      window.dispatchEvent(new Event("nt:auth"));
      router.refresh();
      router.push("/account");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="New password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="new-password"
        hint="At least 8 characters."
      />
      <Input
        label="Confirm new password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        autoComplete="new-password"
      />
      {error && (
        <p className="font-sans text-small text-brand-red-700" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} className="w-full">
        Set new password
      </Button>
      <p className="text-center font-sans text-small text-neutral-ink/70">
        <Link
          href="/signin"
          className="text-brand-red-600 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
        >
          ← Back to sign in
        </Link>
      </p>
    </form>
  );
}
