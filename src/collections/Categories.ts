import type { CollectionConfig } from "payload";

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const Categories: CollectionConfig = {
  slug: "categories",
  labels: {
    singular: "Category",
    plural: "Categories",
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "parent"],
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
        if (!data.slug && data.name) {
          data.slug = slugify(data.name);
        }
        return data;
      },
    ],
  },
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
      type: "textarea",
      admin: {
        description: "Short blurb shown on the category page.",
      },
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      label: "Hero image",
      admin: {
        description: "Shown at the top of the category page.",
      },
    },
    {
      name: "parent",
      type: "relationship",
      relationTo: "categories",
      admin: {
        description:
          "Leave blank for top-level categories. Pick a parent to nest this one under it.",
      },
    },
  ],
};

export default Categories;
