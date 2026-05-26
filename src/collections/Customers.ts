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
    // Anyone can create a customer (signup is open). Rate limiting /
    // honeypot / captcha would live on the storefront sign-up form.
    create: () => true,
    // Admins read all. Logged-in customers read only their own record
    // (Payload narrows the result set via the returned where filter).
    read: ({ req }) => {
      if (req.user?.collection === "users") return true;
      if (req.user?.collection === "customers") {
        return { id: { equals: req.user.id } };
      }
      return false;
    },
    update: ({ req }) => {
      if (req.user?.collection === "users") return true;
      if (req.user?.collection === "customers") {
        return { id: { equals: req.user.id } };
      }
      return false;
    },
    // Delete stays admin-only — customers shouldn't self-serve account
    // deletion via API without confirmation flows we haven't built.
    delete: ({ req }) => req.user?.collection === "users",
  },
  // Guest-order auto-claim intentionally disabled for launch safety.
  // Matching historical guest orders to a newly-created account by email alone
  // lets someone squat another person's email and absorb their order history
  // before email ownership is proven. Add this back only behind Payload email
  // verification or a signed claim-link flow from the order-confirmation email.
  fields: [
    {
      name: "name",
      type: "text",
    },
    {
      name: "stripeCustomerId",
      type: "text",
      index: true,
      // Customer can READ their own Stripe id (useful for support
      // lookups) but cannot write it — set by server-side flows only.
      access: {
        update: ({ req }) => req.user?.collection === "users",
      },
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
