import type { CollectionConfig } from "payload";
import { lexicalEditor } from "@payloadcms/richtext-lexical";

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const Products: CollectionConfig = {
  slug: "products",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "category", "basePrice", "status", "featured"],
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.collection === "users",
    update: ({ req }) => req.user?.collection === "users",
    delete: ({ req }) => req.user?.collection === "users",
  },
  hooks: {
    beforeChange: [
      // Always normalize the slug. If the admin left it blank, auto-fill
      // from name. If they typed something custom (for SEO), still run it
      // through slugify so spaces/capitals/punctuation can't sneak into
      // the URL and break the storefront. "One Size Fits All Romper"
      // becomes "one-size-fits-all-romper" either way.
      ({ data }) => {
        if (!data) return data;
        if (data.slug) {
          data.slug = slugify(String(data.slug));
        } else if (data.name) {
          data.slug = slugify(String(data.name));
        }
        return data;
      },
    ],
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Content",
          fields: [
            {
              name: "name",
              type: "text",
              required: true,
            },
            {
              name: "slug",
              type: "text",
              required: true,
              unique: true,
              index: true,
              admin: {
                description:
                  "Auto-fills from the name. Only edit if you know what you're doing.",
              },
            },
            {
              name: "description",
              type: "richText",
              editor: lexicalEditor(),
              admin: {
                description: "The main copy on the product page.",
              },
            },
            {
              name: "category",
              type: "relationship",
              relationTo: "categories",
              required: true,
            },
            {
              name: "basePrice",
              type: "number",
              required: true,
              min: 0,
              label: "Price (USD)",
              admin: {
                description: "Stored as integer cents.",
                components: {
                  Field: "@/components/admin/MoneyField",
                  Cell: "@/components/admin/MoneyField#MoneyCell",
                },
              },
            },
            {
              name: "inventoryCount",
              type: "number",
              min: 0,
              label: "Inventory",
              admin: {
                description:
                  "How many in stock. Leave blank for items you're not tracking yet. If this product has color variants, set inventory on each variant instead — this field is ignored.",
              },
            },
            {
              name: "images",
              type: "array",
              label: "Photos",
              admin: {
                description:
                  "Drag to reorder. First photo is the main image. Optional — you can save a draft and add photos later.",
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
            {
              name: "featured",
              type: "checkbox",
              label: "Show on homepage",
              defaultValue: false,
            },
            {
              name: "status",
              type: "select",
              required: true,
              defaultValue: "draft",
              options: [
                { label: "Draft", value: "draft" },
                { label: "Published", value: "published" },
                { label: "Archived", value: "archived" },
              ],
              admin: {
                description:
                  "Drafts and archived products aren't visible on the storefront.",
              },
            },
          ],
        },
        {
          label: "SEO",
          description: "Optional — leave blank if you're not sure",
          fields: [
            {
              name: "seoTitle",
              type: "text",
              admin: {
                description:
                  "Shown as the browser tab title and the Google result heading.",
              },
            },
            {
              name: "seoDescription",
              type: "textarea",
              admin: {
                description: "The blurb under the title in search results.",
              },
            },
            {
              name: "seoImage",
              type: "upload",
              relationTo: "media",
              admin: {
                description:
                  "Used when this page is shared on social media. Square or landscape works best.",
              },
            },
          ],
        },
      ],
    },
  ],
};

export default Products;
