"use client";

import NewsletterSignup from "./NewsletterSignup";

async function defaultStub(_email: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
}

export function FooterNewsletter({
  onSubscribe,
}: {
  onSubscribe?: (email: string) => Promise<void>;
}) {
  return (
    <NewsletterSignup
      onSubscribe={onSubscribe ?? defaultStub}
      heading="Stay in the loop"
      description="Occasional updates on new arrivals and the story behind the work."
    />
  );
}
