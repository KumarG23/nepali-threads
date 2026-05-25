"use client";

import NewsletterSignup from "@/components/storefront/NewsletterSignup";

export function DemoDefault() {
  const handler = async (email: string) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  };
  return <NewsletterSignup onSubscribe={handler} />;
}

export function DemoCustomCopy() {
  const handler = async (email: string) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  };
  return (
    <NewsletterSignup
      onSubscribe={handler}
      heading="Join the studio list"
      description="Behind-the-scenes notes from the workshop, twice a month."
    />
  );
}

export function DemoError() {
  const handler = async (email: string) => {
    await new Promise<void>((_, reject) =>
      setTimeout(
        () => reject(new Error("This email is already subscribed.")),
        1000
      )
    );
  };
  return (
    <NewsletterSignup
      onSubscribe={handler}
      heading="Error demo"
      description="This demo always fails so you can eyeball the error state."
    />
  );
}
