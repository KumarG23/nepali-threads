"use client";

import Button from "@/components/ui/Button";

export function AddToCartButton() {
  return (
    <Button
      variant="primary"
      size="lg"
      className="w-full sm:w-auto"
      onClick={() => {
        window.alert("Cart isn't wired up yet — Phase 3.");
      }}
    >
      Add to cart
    </Button>
  );
}
