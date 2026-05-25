import type { Metadata } from "next";

import { CartPageContent } from "./_cart-content";

export const metadata: Metadata = {
  title: "Cart",
  description: "Your selected pieces.",
};

export default function CartPage() {
  return <CartPageContent />;
}
