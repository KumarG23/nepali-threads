"use client";

import { useEffect } from "react";

import { useCart } from "@/store/cart";

// Clears the cart store on mount. Used by the /cart/success page after
// Stripe Checkout redirects back — the order has been persisted to
// Payload server-side at this point, so the client-side cart is safe
// to wipe. Using useCart.getState().clear() (imperative API) avoids
// subscribing the component to the store, so it doesn't re-render
// when other components mutate the cart.
export function ClearCart() {
  useEffect(() => {
    useCart.getState().clear();
  }, []);
  return null;
}
