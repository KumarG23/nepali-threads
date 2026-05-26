import Link from "next/link";
import React from "react";

import Image from "@/components/ui/Image";

function cx(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(" ");
}

export interface HeroProps {
  imageSrc: string;
  imageAlt: string;
  heading: string;
  eyebrow?: string;
  body?: string;
  cta?: { label: string; href: string };
  aspectRatio?: "landscape" | "tall";
  className?: string;
  ref?: React.Ref<HTMLElement>;
}

export function Hero({
  imageSrc,
  imageAlt,
  heading,
  eyebrow,
  body,
  cta,
  aspectRatio = "landscape",
  className,
  ref,
}: HeroProps) {
  return (
    <section ref={ref} className={cx("relative", className)}>
      <Image
        src={imageSrc}
        alt={imageAlt}
        aspectRatio={aspectRatio}
        rounded="none"
        priority
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-neutral-ink/70 via-neutral-ink/30 to-transparent"
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-12 lg:p-16">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="font-sans text-small font-medium uppercase tracking-wide text-neutral-cream/80 mb-3">
              {eyebrow}
            </p>
          )}
          <h1 className="font-serif text-h1 sm:text-display text-neutral-cream">
            {heading}
          </h1>
          {body && (
            <p className="font-sans text-body text-neutral-cream/90 mt-4 max-w-xl">
              {body}
            </p>
          )}
          {cta && (
            <Link
              href={cta.href}
              className="mt-6 inline-flex items-center justify-center rounded font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 bg-brand-red-600 text-neutral-cream hover:bg-brand-red-700 active:bg-brand-red-800 px-6 py-3 text-h3 min-h-[48px]"
            >
              {cta.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default Hero;
