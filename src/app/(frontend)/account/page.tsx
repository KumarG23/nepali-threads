import Link from "next/link";
import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import config from "@payload-config";

import { AccountContent } from "./_account-content";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const payload = await getPayload({ config });
  const headers = await nextHeaders();
  const { user } = await payload.auth({ headers });

  if (!user || user.collection !== "customers") {
    redirect("/signin");
  }

  const customer = user;
  const memberSince = new Date(customer.createdAt).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );

  return (
    <article className="mx-auto max-w-2xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
      <p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-3">
        Account
      </p>
      <h1 className="font-serif text-h1 text-neutral-ink mb-4">
        Hello, {customer.name ?? customer.email}.
      </h1>
      <div className="space-y-2 font-sans text-body text-neutral-ink/70 mb-8">
        <p>{customer.email}</p>
        <p>Member since {memberSince}.</p>
      </div>

      <div className="mb-8">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1 font-sans text-body font-medium text-brand-red-600 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
        >
          View your orders →
        </Link>
      </div>

      <AccountContent />
    </article>
  );
}
