// LOCAL-LLM: DO NOT EDIT
import type { CollectionConfig } from "payload";

// System-only collection. Written by the order/checkout pipeline when a
// gift card is applied to a purchase. Never edited from the admin UI.
export const GiftCardRedemptions: CollectionConfig = {
  slug: "gift-card-redemptions",
  labels: {
    singular: "Gift card redemption",
    plural: "Gift card redemptions",
  },
  admin: {
    useAsTitle: "id",
    description: "Read-only audit log of every gift card application.",
    defaultColumns: ["giftCard", "order", "amountUsed", "createdAt"],
    // Hidden from the sidebar for everyone except super-admin to keep
    // the admin nav focused on actionable collections.
    hidden: ({ user }) =>
      !(user?.collection === "users" && (user as { role?: string }).role === "super-admin"),
  },
  access: {
    read: ({ req }) =>
      req.user?.collection === "users" &&
      (req.user as { role?: string }).role === "super-admin",
    create: () => false, // system-only via Local API override
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: "giftCard",
      type: "relationship",
      relationTo: "gift-cards",
      required: true,
      index: true,
    },
    {
      name: "order",
      type: "relationship",
      relationTo: "orders",
      required: true,
      index: true,
    },
    {
      name: "amountUsed",
      type: "number",
      required: true,
      min: 0,
      label: "Amount used (USD)",
      admin: {
        description: "Stored as integer cents.",
        components: {
          Field: "@/components/admin/MoneyField",
          Cell: "@/components/admin/MoneyField#MoneyCell",
        },
      },
    },
    // The schema lists "timestamp" — Payload auto-emits createdAt on
    // every collection, so we don't add a redundant field. Treat
    // createdAt as the timestamp.
  ],
};

export default GiftCardRedemptions;
