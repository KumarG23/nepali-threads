import type { CollectionConfig } from "payload";
import { lexicalEditor } from "@payloadcms/richtext-lexical";

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const Pages: CollectionConfig = {
  slug: "pages",
  labels: {
    singular: "Page",
    plural: "Pages",
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug"],
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
        if (!data.slug && data.title) {
          data.slug = slugify(data.title);
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "title",
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
        description: "Auto-fills from the title. Used in the URL.",
      },
    },
    {
      name: "blocks",
      type: "blocks",
      required: true,
      minRows: 1,
      labels: {
        singular: "Block",
        plural: "Blocks",
      },
      admin: {
        description: "Add rich text or image blocks to build the page.",
      },
      blocks: [
        {
          slug: "richText",
          labels: {
            singular: "Rich text",
            plural: "Rich text blocks",
          },
          fields: [
            {
              name: "content",
              type: "richText",
              editor: lexicalEditor(),
              required: true,
            },
          ],
        },
        {
          slug: "image",
          labels: {
            singular: "Image",
            plural: "Images",
          },
          fields: [
            {
              name: "image",
              type: "upload",
              relationTo: "media",
              required: true,
              label: "Image",
            },
            {
              name: "caption",
              type: "text",
              label: "Caption",
              admin: {
                description: "Optional caption shown below the image.",
              },
            },
            {
              name: "alignment",
              type: "select",
              defaultValue: "center",
              options: [
                { label: "Left", value: "left" },
                { label: "Center", value: "center" },
                { label: "Full width", value: "full-width" },
              ],
              admin: {
                description: "How the image is positioned on the page.",
              },
            },
          ],
        },
      ],
    },
  ],
};

export default Pages;
