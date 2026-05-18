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
      ({ data }) => {
        if (data && !data.slug && data.name) {
          data.slug = slugify(data.name);
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
              name: "description",
              type: "richText",
              editor: lexicalEditor(),
              admin: {
                description: "The main copy on the product page.",
              },
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
              name: "category",
              type: "relationship",
              relationTo: "categories",
              required: true,
            },
            {
              name: "images",
              type: "array",
              label: "Photos",
              required: true,
              minRows: 1,
              admin: {
                description:
                  "Drag to reorder. First photo is the main image.",
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
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        position: "sidebar",
        description:
          "Auto-fills from the name. Only edit if you know what you're doing.",
      },
    },
  ],
};

export default Products;
