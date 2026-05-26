import type { Metadata } from "next";

import { ForgotPasswordForm } from "./_forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot your password?",
  description: "Reset your Nepali Threads account password.",
};

export default function ForgotPasswordPage() {
  return (
    <article className="mx-auto max-w-md px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
      <p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-3">
        Account
      </p>
      <h1 className="font-serif text-h1 text-neutral-ink mb-4">
        Forgot your password?
      </h1>
      <p className="font-sans text-body text-neutral-ink/70 mb-8">
        Enter the email on your account and we&apos;ll send you a link to set a new password.
      </p>
      <ForgotPasswordForm />
    </article>
  );
}
