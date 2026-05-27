"use client";

import Button from "@/components/ui/Button";
import { useCart } from "@/store/cart";

type AddToCartButtonProps = {
  productId: number;
  variantId?: number;
  productSlug: string;
  name: string;
  variantLabel?: string;
  priceCents: number;
  imageSrc: string;
  imageAlt: string;
  disabled?: boolean;
  unavailable?: boolean;
};

export function AddToCartButton(props: AddToCartButtonProps) {
  const addItem = useCart((state) => state.addItem);
  const { unavailable, disabled, ...rest } = props;
  // Belt-and-braces: an unavailable combination must also be unclickable,
  // independent of whether the caller remembered to pass disabled=true.
  const isInactive = disabled || unavailable;

  return (
    <Button
      variant="primary"
      size="lg"
      className="w-full sm:w-auto"
      disabled={isInactive}
      onClick={() => addItem(rest)}
    >
      {unavailable
        ? "This combination isn't available"
        : disabled
          ? "Sold out"
          : "Add to cart"}
    </Button>
  );
}
