import type { Metadata } from "next";

import { SignUpForm } from "./_signup-form";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a Nepali Threads account to track your orders.",
};

export default function SignUpPage() {
  return (
    <article className="mx-auto max-w-md px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
      <p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-3">
        Get started
      </p>
      <h1 className="font-serif text-h1 text-neutral-ink mb-4">
        Create an account
      </h1>
      <p className="font-sans text-body text-neutral-ink/70 mb-8">
        Stay in the loop on new collections and track your orders.
      </p>
      <SignUpForm />
    </article>
  );
}
