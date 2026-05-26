import Link from "next/link";
import React from "react";

import { AccountLink } from "./_account-link";
import { CartCount } from "./_cart-count";
import { MobileNav } from "./_mobile-nav";

function cx(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(" ");
}

export interface HeaderProps {
  className?: string;
  ref?: React.Ref<HTMLElement>;
}

export function Header({
  className,
  ref,
}: HeaderProps) {
  const navLinkClasses =
    "font-sans text-body font-medium text-neutral-ink/80 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded";

  return (
    <header
      ref={ref}
      className={cx(
        "bg-neutral-cream border-b border-neutral-ink/10",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-6 py-4 sm:px-8 lg:px-12 lg:py-5">
        <div className="flex items-center justify-between">
          {/* Mobile: hamburger left, brand center-ish */}
          <div className="flex items-center gap-3">
            <MobileNav />
            <Link
              href="/"
              className="font-serif text-h2 text-neutral-ink hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
            >
              nepali threads
            </Link>
          </div>

          {/* Desktop nav */}
          <nav
            aria-label="Primary"
            className="hidden flex-wrap items-center gap-4 md:flex md:gap-6"
          >
            <Link href="/shop" className={navLinkClasses}>
              Shop
            </Link>
            <Link href="/shop?filter=new" className={navLinkClasses}>
              New
            </Link>
            <Link href="/about" className={navLinkClasses}>
              Story
            </Link>
          </nav>

          {/* Account + Cart — desktop only; mobile equivalents are inside drawer */}
          <div className="hidden items-center gap-4 md:flex md:gap-6">
            <AccountLink />
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 rounded font-sans text-body font-medium text-neutral-ink/80 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2"
            >
              <CartCount />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
