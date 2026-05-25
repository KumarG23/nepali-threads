import React from "react";

import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Image from "@/components/ui/Image";

function cx(...args: (string | false | undefined | null)[]): string {
  return args.filter(Boolean).join(" ");
}

function formatPriceCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export interface ProductCardProps {
  name: string;
  priceCents: number;
  imageSrc: string;
  imageAlt: string;
  badge?: {
    label: string;
    variant: "neutral" | "primary" | "accent" | "muted";
  };
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}

export function ProductCard({
  name,
  priceCents,
  imageSrc,
  imageAlt,
  badge,
  className,
  ref,
}: ProductCardProps) {
  return (
    <Card
      ref={ref}
      variant="flat"
      padding="none"
      className={cx("group overflow-hidden", className)}
    >
      <div className="relative">
        <Image
          src={imageSrc}
          alt={imageAlt}
          aspectRatio="portrait"
          rounded="none"
        />
        {badge && (
          <Badge
            variant={badge.variant}
            size="sm"
            className="absolute top-2 left-2 z-10"
          >
            {badge.label}
          </Badge>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-serif text-h3 mb-1">{name}</h3>
        <p className="font-sans text-body text-neutral-ink/80">
          {formatPriceCents(priceCents)}
        </p>
      </div>
    </Card>
  );
}

export default ProductCard;
