import type { Metadata } from "next";

import { ResetPasswordForm } from "./_reset-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Choose a new password for your Nepali Threads account.",
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: PageProps) {
  const { token } = await searchParams;

  return (
    <article className="mx-auto max-w-md px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
      <p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-3">
        Account
      </p>
      <h1 className="font-serif text-h1 text-neutral-ink mb-4">
        Set a new password
      </h1>
      <p className="font-sans text-body text-neutral-ink/70 mb-8">
        Pick something at least 8 characters. You&apos;ll be signed in once it&apos;s set.
      </p>
      <ResetPasswordForm token={token ?? ""} />
    </article>
  );
}
