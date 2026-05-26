import type { Metadata } from "next";

import { SignInForm } from "./_signin-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Nepali Threads account.",
};

export default function SignInPage() {
  return (
    <article className="mx-auto max-w-md px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
      <p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-3">
        Welcome back
      </p>
      <h1 className="font-serif text-h1 text-neutral-ink mb-4">Sign in</h1>
      <p className="font-sans text-body text-neutral-ink/70 mb-8">
        Use your account email and password.
      </p>
      <SignInForm />
    </article>
  );
}
