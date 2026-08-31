"use client";

import React from "react";

import NewsletterSignup from "./NewsletterSignup";

export function FooterNewsletter({
  onSubscribe,
}: {
  onSubscribe?: (email: string) => Promise<void>;
}) {
  if (!onSubscribe) {
    return (
      <section className="max-w-md">
        <h2 className="mb-3 font-serif text-h2">Stay in the loop</h2>
        <p className="font-sans text-body text-neutral-cream/70">
          Newsletter updates are coming soon. Follow us on Instagram for new
          arrivals in the meantime.
        </p>
      </section>
    );
  }

  return (
    <NewsletterSignup
      onSubscribe={onSubscribe}
      heading="Stay in the loop"
      description="Occasional updates on new arrivals and the story behind the work."
    />
  );
}
