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
};

export function AddToCartButton(props: AddToCartButtonProps) {
  const addItem = useCart((state) => state.addItem);

  return (
    <Button
      variant="primary"
      size="lg"
      className="w-full sm:w-auto"
      disabled={props.disabled}
      onClick={() => addItem(props)}
    >
      {props.disabled ? "Sold out" : "Add to cart"}
    </Button>
  );
}
