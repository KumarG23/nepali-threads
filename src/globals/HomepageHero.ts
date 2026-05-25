import type { GlobalConfig } from "payload";

export const HomepageHero: GlobalConfig = {
  slug: "homepageHero",
  label: "Homepage Hero",
  access: {
    read: () => true,
    update: ({ req }) => req.user?.collection === "users",
  },
  admin: {
    description:
      "Controls the big image and text block at the top of the homepage. Any field left blank uses the built-in default.",
  },
  fields: [
    {
      name: "eyebrow",
      type: "text",
      label: "Eyebrow",
      admin: {
        description:
          "Small uppercased line above the headline (e.g. 'New collection'). Leave blank to keep the default.",
      },
    },
    {
      name: "heading",
      type: "text",
      label: "Headline",
      admin: {
        description:
          "Main headline. Keep it short — one sentence works best. Leave blank to keep the default.",
      },
    },
    {
      name: "body",
      type: "textarea",
      label: "Body",
      admin: {
        description:
          "One or two sentences below the headline. Leave blank to keep the default.",
      },
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      label: "Background image",
      admin: {
        description:
          "Hero background image. Landscape works best. Leave blank to keep the current default.",
      },
    },
    {
      name: "ctaLabel",
      type: "text",
      label: "Button text",
      admin: {
        description:
          "Text on the call-to-action button (e.g. 'Shop the collection'). Leave blank to keep the default.",
      },
    },
    {
      name: "ctaHref",
      type: "text",
      label: "Button link",
      admin: {
        description:
          "Where the button goes when clicked. Use a path like /shop or /categories/cardigans. Leave blank to keep the default (/shop).",
      },
    },
  ],
};

export default HomepageHero;
