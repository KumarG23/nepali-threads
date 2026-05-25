import Link from "next/link";

export default function NotFound() {
  return (
    <article className="mx-auto max-w-2xl px-6 py-24 text-center sm:px-8 lg:px-12 lg:py-32">
      <p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-3">
        404
      </p>
      <h1 className="font-serif text-display text-neutral-ink mb-4">
        We can&apos;t find that page.
      </h1>
      <p className="font-sans text-body text-neutral-ink/70 mb-8">
        The link might have moved, or the page might never have existed. Either
        way, the shop&apos;s still here.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 bg-brand-red-600 text-neutral-cream hover:bg-brand-red-700 active:bg-brand-red-800 px-6 py-3 text-h3 min-h-[48px]"
      >
        Back to the shop
      </Link>
    </article>
  );
}
