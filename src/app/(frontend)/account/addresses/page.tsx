import type { Metadata } from "next";
import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import config from "@payload-config";

import { AddressesContent } from "./_addresses-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your addresses",
};

export default async function AddressesPage() {
  const payload = await getPayload({ config });
  const headers = await nextHeaders();
  const { user } = await payload.auth({ headers });

  if (!user || user.collection !== "customers") {
    redirect("/signin");
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
      <p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-3">
        Account
      </p>
      <h1 className="font-serif text-h1 text-neutral-ink mb-2">
        Your addresses
      </h1>
      <p className="font-sans text-body text-neutral-ink/70 mb-8">
        Saved shipping and billing addresses. The default address is used at
        checkout.
      </p>
      <AddressesContent
        customerId={typeof user.id === "number" ? user.id : -1}
        initialAddresses={user.addresses ?? []}
      />
    </article>
  );
}
