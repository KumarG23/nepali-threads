"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, name: name || undefined }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          errors?: { message?: string }[];
          message?: string;
        };
        const message =
          data.errors?.[0]?.message ?? data.message ?? "";

        if (response.status === 409 || message.includes("already exists")) {
          setError("That email is already in use — try signing in.");
        } else if (
          response.status === 400 &&
          message.toLowerCase().includes("password")
        ) {
          setError("Password needs at least 8 characters.");
        } else if (
          response.status === 400 &&
          message.toLowerCase().includes("email")
        ) {
          setError("Please enter a valid email.");
        } else {
          setError("Couldn't create your account. Please try again.");
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      window.dispatchEvent(new Event("nt:auth"));
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        hint="Optional — we only use this to say hello."
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="new-password"
        hint="At least 8 characters."
      />
      {success && (
        <p className="font-sans text-small text-neutral-ink/70" role="status">
          Account created. Check your email and click the verification link so
          we can safely link any matching guest orders.
        </p>
      )}
      {error && (
        <p className="font-sans text-small text-brand-red-700" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} className="w-full">
        Create account
      </Button>
      <p className="text-center font-sans text-small text-neutral-ink/70">
        Already have an account?{" "}
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
