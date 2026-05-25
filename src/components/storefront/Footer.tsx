import Link from "next/link";
import React from "react";

import { FooterNewsletter } from "./_footer-newsletter";

function cx(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(" ");
}

export interface FooterProps {
  onSubscribe?: (email: string) => Promise<void>;
  className?: string;
  ref?: React.Ref<HTMLElement>;
}

export function Footer({
  onSubscribe,
  className,
  ref,
}: FooterProps) {
  const linkColumns = [
    {
      title: "Shop",
      links: [
        { label: "New arrivals", href: "/shop?filter=new" },
        { label: "All products", href: "/shop" },
        { label: "Gift cards", href: "/gift-cards" },
      ],
    },
    {
      title: "Customer",
      links: [
        { label: "Shipping", href: "/shipping" },
        { label: "Returns", href: "/returns" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "About",
      links: [
        { label: "Our story", href: "/about" },
        { label: "Sustainability", href: "/sustainability" },
        { label: "Press", href: "/press" },
      ],
    },
    {
      title: "Connect",
      links: [
        { label: "Instagram", href: "https://instagram.com/nepalithreads" },
        { label: "Email", href: "mailto:hello@nepali-threads.com" },
      ],
    },
  ];

  return (
    <footer
      ref={ref}
      className={cx("bg-neutral-ink text-neutral-cream", className)}
    >
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
        {/* Top row: newsletter + brand */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 mb-16">
          <FooterNewsletter onSubscribe={onSubscribe} />
          <div>
            <p className="font-serif text-h2">nepali threads</p>
            <p className="font-sans text-body text-neutral-cream/70 mt-2">
              Handmade in Nepal. Worn anywhere.
            </p>
            <Link
              href="/about"
              className="text-brand-gold-400 hover:text-brand-gold-300 mt-4 inline-block transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
            >
              Read our story →
            </Link>
          </div>
        </div>

        {/* Middle row: link columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-16 border-t border-neutral-cream/10 pt-12">
          {linkColumns.map((column) => (
            <div key={column.title}>
              <h3 className="font-sans text-small font-semibold uppercase tracking-wide text-neutral-cream/90 mb-4">
                {column.title}
              </h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block py-1 text-body text-neutral-cream/70 hover:text-neutral-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row: sign-off */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-neutral-cream/10 pt-8">
          <p className="font-sans text-small text-neutral-cream/60">
            © {new Date().getFullYear()} Nepali Threads. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link
              href="/privacy"
              className="font-sans text-small text-neutral-cream/60 hover:text-neutral-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="font-sans text-small text-neutral-cream/60 hover:text-neutral-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
