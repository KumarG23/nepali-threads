"use client";

import { useEffect, useState } from "react";

import { selectItemCount, useCart } from "@/store/cart";

export function CartCount() {
  const [hydrated, setHydrated] = useState(false);
  const itemCount = useCart(selectItemCount);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated || itemCount === 0) {
    return <span>Cart</span>;
  }
  return <span>Cart ({itemCount})</span>;
}
