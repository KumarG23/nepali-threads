"use client";

import Button from "@/components/ui/Button";
import { useCart } from "@/store/cart";

type AddToCartButtonProps = {
  productId: number;
  productSlug: string;
  name: string;
  priceCents: number;
  imageSrc: string;
  imageAlt: string;
};

export function AddToCartButton(props: AddToCartButtonProps) {
  const addItem = useCart((state) => state.addItem);

  return (
    <Button
      variant="primary"
      size="lg"
      className="w-full sm:w-auto"
      onClick={() => addItem(props)}
    >
      Add to cart
    </Button>
  );
}
