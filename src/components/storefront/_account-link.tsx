"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Customer } from "@/payload-types";

interface AccountLinkProps {
  onClick?: () => void;
}

export function AccountLink({ onClick }: AccountLinkProps) {
  const [user, setUser] = useState<Customer | null | undefined>(undefined);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/customers/me", {
          credentials: "include",
        });
        const data = (await response.json()) as { user: Customer | null };
        setUser(data.user);
      } catch {
        setUser(null);
      }
    }
    checkAuth();

    function handleAuthChange() {
      checkAuth();
    }
    window.addEventListener("nt:auth", handleAuthChange);
    return () => window.removeEventListener("nt:auth", handleAuthChange);
  }, []);

  // Pre-hydration and during fetch: render "Sign in" as the safe default.
  // This avoids hydration mismatch (server has no cookie context) and
  // prevents a flash of "Account" before the fetch completes.
  if (user === undefined) {
    return (
      <Link
        href="/signin"
        onClick={onClick}
        className="font-sans text-body font-medium text-neutral-ink/80 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
      >
        Sign in
      </Link>
    );
  }

  if (user === null) {
    return (
      <Link
        href="/signin"
        onClick={onClick}
        className="font-sans text-body font-medium text-neutral-ink/80 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
      >
        Sign in
      </Link>
    );
  }

  return (
    <Link
      href="/account"
      onClick={onClick}
      className="font-sans text-body font-medium text-neutral-ink/80 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
    >
      Account
    </Link>
  );
}
