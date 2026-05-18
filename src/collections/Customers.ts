// LOCAL-LLM: DO NOT EDIT
import type { CollectionConfig } from "payload";

// auth: true automatically adds email + hashed password and emits
// createdAt / updatedAt timestamps. Don't add those manually.
export const Customers: CollectionConfig = {
  slug: "customers",
  auth: true,
  admin: {
    useAsTitle: "email",
    // Customers are managed primarily through storefront flows. Admins
    // can browse them for support but shouldn't be editing freely.
    defaultColumns: ["email", "name", "stripeCustomerId", "createdAt"],
  },
  access: {
    // TODO(phase 2): customer self-service read/update of own record via
    // an explicit /me endpoint or beforeRead hook. For now: admin only.
    read: ({ req }) => req.user?.collection === "users",
    create: ({ req }) => req.user?.collection === "users",
    update: ({ req }) => req.user?.collection === "users",
    delete: ({ req }) => req.user?.collection === "users",
  },
  fields: [
    {
      name: "name",
      type: "text",
    },
    {
      name: "stripeCustomerId",
      type: "text",
      index: true,
      admin: {
        readOnly: true,
        description:
          "Set automatically when the customer first checks out. Don't edit.",
      },
    },
    {
      name: "newsletterOptIn",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "addresses",
      type: "array",
      labels: { singular: "Address", plural: "Addresses" },
      fields: [
        { name: "label", type: "text", admin: { description: "e.g. Home, Office" } },
        { name: "recipientName", type: "text", required: true },
        { name: "line1", type: "text", required: true },
        { name: "line2", type: "text" },
        { name: "city", type: "text", required: true },
        { name: "region", type: "text", required: true, label: "State / Region" },
        { name: "postalCode", type: "text", required: true },
        // TODO(phase 2): swap to a country enum once we lock down shipping zones.
        { name: "country", type: "text", required: true, defaultValue: "US" },
        { name: "phone", type: "text" },
        { name: "isDefault", type: "checkbox", defaultValue: false },
        {
          name: "type",
          type: "radio",
          defaultValue: "both",
          options: [
            { label: "Shipping", value: "shipping" },
            { label: "Billing", value: "billing" },
            { label: "Both", value: "both" },
          ],
        },
      ],
    },
  ],
};

export default Customers;
