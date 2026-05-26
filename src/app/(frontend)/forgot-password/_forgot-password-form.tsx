"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    // Fire and forget — even if the email isn't on file, we show the
    // same "check your inbox" state. Avoids leaking which addresses
    // have accounts.
    try {
      await fetch("/api/customers/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Swallow — user-facing state is identical either way.
    }

    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <p className="font-sans text-body text-neutral-ink">
          If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent a reset link.
          Check your inbox — the link expires in an hour.
        </p>
        <p className="font-sans text-small text-neutral-ink/70">
          Didn&apos;t get it? Check spam, or{" "}
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-brand-red-600 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded underline"
          >
            try a different email
          </button>
          .
        </p>
        <p className="text-center font-sans text-small text-neutral-ink/70">
          <Link
            href="/signin"
            className="text-brand-red-600 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
          >
            ← Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <Button type="submit" loading={loading} className="w-full">
        Send reset link
      </Button>
      <p className="text-center font-sans text-small text-neutral-ink/70">
        Remembered it?{" "}
        <Link
          href="/signin"
          className="text-brand-red-600 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
        >
          Sign in →
        </Link>
      </p>
    </form>
  );
}
