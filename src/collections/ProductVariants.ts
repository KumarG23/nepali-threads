// PLACEHOLDER — fleshed out in Step 5 Prompt B.
// Defined now (with just a product relation) so that Orders.lineItems.variant
// has a valid relationship target. Prompt B replaces this file with the
// full schema per LLM_PROJECT_CONTEXT.md.
import type { CollectionConfig } from "payload";

export const ProductVariants: CollectionConfig = {
  slug: "product-variants",
  admin: { useAsTitle: "sku" },
  fields: [
    { name: "product", type: "relationship", relationTo: "products", required: true },
    { name: "sku", type: "text" },
  ],
};

export default ProductVariants;
