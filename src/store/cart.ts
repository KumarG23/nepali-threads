import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: number;
  variantId?: number;
  productSlug: string;
  name: string;
  variantLabel?: string;
  priceCents: number;
  imageSrc: string;
  imageAlt: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: number, variantId?: number) => void;
  updateQuantity: (productId: number, variantId: number | undefined, quantity: number) => void;
  clear: () => void;
};

const sameLine = (
  a: { productId: number; variantId?: number },
  b: { productId: number; variantId?: number }
) => a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null);

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, item));
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item)
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !sameLine(i, { productId, variantId })
          ),
        })),
      updateQuantity: (productId, variantId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter(
                (i) => !sameLine(i, { productId, variantId })
              ),
            };
          }
          return {
            items: state.items.map((i) =>
              sameLine(i, { productId, variantId }) ? { ...i, quantity } : i
            ),
          };
        }),
      clear: () => set({ items: [] }),
    }),
    {
      name: "nepali-threads-cart",
      version: 2,
      migrate: (_persistedState, fromVersion) => {
        if (fromVersion < 2) {
          // Drop legacy carts — items lacked variantId and can't be safely
          // backfilled. Acceptable at pre-launch.
          return { items: [] } as unknown as CartState;
        }
        return _persistedState as unknown as CartState;
      },
    }
  )
);

export const selectItemCount = (state: CartState): number =>
  state.items.reduce((sum, i) => sum + i.quantity, 0);

export const selectSubtotalCents = (state: CartState): number =>
  state.items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
