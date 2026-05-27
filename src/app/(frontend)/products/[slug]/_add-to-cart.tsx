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

  return (
    <Button
      variant="primary"
      size="lg"
      className="w-full sm:w-auto"
      disabled={disabled}
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
