"use client";

import React from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function cx(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(" ");
}

export interface NewsletterSignupProps {
  onSubscribe: (email: string) => Promise<void>;
  heading?: string;
  description?: string;
  successMessage?: string;
  submitLabel?: string;
  className?: string;
}

export function NewsletterSignup({
  onSubscribe,
  heading = "Stay in the loop",
  description = "Get occasional updates on new arrivals, restocks, and the story behind the work.",
  successMessage = "Thanks — you'll hear from us soon.",
  submitLabel = "Subscribe",
  className,
}: NewsletterSignupProps) {
  const [status, setStatus] = React.useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [email, setEmail] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>(
    undefined
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;

    setStatus("submitting");
    setErrorMessage(undefined);

    try {
      await onSubscribe(email);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    }
  }

  return (
    <section className={cx("max-w-md", className)}>
      <h2 className="font-serif text-h2 mb-3">{heading}</h2>
      <p className="font-sans text-body text-neutral-ink/70">{description}</p>

      {status === "success" ? (
        <p
          role="status"
          className="mt-6 font-sans text-body text-brand-red-700"
        >
          {successMessage}
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <Input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            label="Email"
            disabled={status === "submitting"}
            error={status === "error" ? errorMessage : undefined}
            className="flex-1"
          />
          <div className="sm:mt-[1.625rem]">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={status === "submitting"}
              disabled={status === "submitting"}
            >
              {submitLabel}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

export default NewsletterSignup;
