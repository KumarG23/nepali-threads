import Link from "next/link";
import { getPayload } from "payload";

import config from "@payload-config";
import { claimGuestOrdersForVerifiedCustomer } from "@/lib/customers/claim-guest-orders";

type SearchParams = {
  token?: string;
};

type CustomerWithVerification = {
  id: number | string;
  email?: string | null;
  emailVerifiedAt?: string | null;
};

type VerificationResult =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "success"; claimed: number };

async function verifyToken(token: string): Promise<VerificationResult> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "customers",
    where: { emailVerificationToken: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const customer = result.docs[0] as CustomerWithVerification | undefined;
  if (!customer?.email || typeof customer.id !== "number") {
    return { status: "invalid" };
  }

  await payload.update({
    collection: "customers",
    id: customer.id,
    data: {
      emailVerifiedAt: new Date().toISOString(),
      emailVerificationToken: null,
    },
    overrideAccess: true,
  });

  const claimed = await claimGuestOrdersForVerifiedCustomer({
    payload,
    customerId: customer.id,
    email: customer.email,
  });

  return { status: "success", claimed };
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyToken(token) : { status: "missing" as const };

  const title =
    result.status === "success"
      ? "Email verified."
      : result.status === "missing"
        ? "Verification link missing."
        : "Verification link expired.";

  const body =
    result.status === "success"
      ? result.claimed > 0
        ? `Your email is verified and ${result.claimed} guest order${result.claimed === 1 ? "" : "s"} ${result.claimed === 1 ? "has" : "have"} been linked to your account.`
        : "Your email is verified. Future matching orders can now be linked safely."
      : result.status === "missing"
        ? "Open the verification link from your email, or sign in and contact us if you need a new link."
        : "This verification link is invalid or has already been used. Sign in or contact us if you need help.";

  return (
    <article className="mx-auto max-w-2xl px-6 py-24 text-center sm:px-8 lg:px-12 lg:py-32">
      <p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-3">
        Account verification
      </p>
      <h1 className="font-serif text-display text-neutral-ink mb-4">
        {title}
      </h1>
      <p className="font-sans text-body text-neutral-ink/70 mb-8">{body}</p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/account"
          className="inline-flex min-h-[48px] items-center justify-center rounded bg-brand-red-600 px-6 py-3 font-sans text-h3 font-medium text-neutral-cream transition-colors hover:bg-brand-red-700 active:bg-brand-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2"
        >
          Go to account
        </Link>
        <Link
          href="/shop"
          className="inline-flex min-h-[48px] items-center justify-center rounded px-6 py-3 font-sans text-h3 font-medium text-neutral-ink/70 transition-colors hover:text-brand-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2"
        >
          Continue shopping
        </Link>
      </div>
    </article>
  );
}
