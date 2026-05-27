import type { CollectionConfig } from "payload";

export const ProductVariants: CollectionConfig = {
  slug: "product-variants",
  admin: {
    useAsTitle: "sku",
    defaultColumns: [
      "sku",
      "product",
      "size",
      "color",
      "inventoryCount",
      "price",
    ],
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.collection === "users",
    update: ({ req }) => req.user?.collection === "users",
    delete: ({ req }) => req.user?.collection === "users",
  },
  hooks: {
    beforeChange: [
      // Normalize swatchHex: admins may paste "16677F" or "#16677F" —
      // store the canonical "#16677F" so the storefront's hex regex
      // matches consistently and the color dot renders.
      ({ data }) => {
        if (!data) return data;
        if (typeof data.swatchHex === "string") {
          const trimmed = data.swatchHex.trim();
          if (!trimmed) {
            data.swatchHex = null;
          } else if (!trimmed.startsWith("#")) {
            data.swatchHex = `#${trimmed}`;
          } else {
            data.swatchHex = trimmed;
          }
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "product",
      type: "relationship",
      relationTo: "products",
      required: true,
    },
    {
      name: "sku",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "SKU",
      admin: {
        description: "Inventory code for this specific variant.",
      },
    },
    {
      name: "size",
      type: "text",
      admin: {
        description:
          "e.g. S, M, L, XL — leave blank if this variant isn't size-specific.",
      },
    },
    {
      name: "color",
      type: "text",
      admin: {
        description:
          "The color name shoppers see, e.g. Crimson, Indigo.",
      },
    },
    {
      name: "swatchHex",
      type: "text",
      label: "Swatch color",
      admin: {
        description:
          "Optional. A hex code like #9B2C2C — used as the round color dot on the product page. If blank, the color name shows as a text button instead.",
      },
    },
    {
      name: "price",
      type: "number",
      min: 0,
      label: "Price override (USD)",
      admin: {
        description:
          "Optional. If set, this overrides the product's base price for this variant. Stored as integer cents.",
        components: {
          Field: "@/components/admin/MoneyField",
          Cell: "@/components/admin/MoneyField#MoneyCell",
        },
      },
    },
    {
      name: "inventoryCount",
      type: "number",
      required: true,
      min: 0,
      defaultValue: 0,
      label: "Inventory",
      admin: {
        description: "How many of this variant we have on hand.",
      },
    },
    {
      name: "images",
      type: "array",
      label: "Photos",
      admin: {
        description:
          "Optional. Falls back to the product's main photos if blank.",
      },
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          required: true,
        },
      ],
    },
  ],
};

export default ProductVariants;
