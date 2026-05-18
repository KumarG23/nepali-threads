// PLACEHOLDER — fleshed out in Step 5 Prompt B.
// Defined now (with just a name field) so that Orders.lineItems.product
// has a valid relationship target. Prompt B replaces this file with the
// full schema per LLM_PROJECT_CONTEXT.md.
import type { CollectionConfig } from "payload";

export const Products: CollectionConfig = {
  slug: "products",
  admin: { useAsTitle: "name" },
  fields: [{ name: "name", type: "text", required: true }],
};

export default Products;
