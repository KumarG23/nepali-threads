// LOCAL-LLM: DO NOT EDIT
import type { CollectionConfig } from "payload";

export const GiftCards: CollectionConfig = {
  slug: "gift-cards",
  admin: {
    useAsTitle: "code",
    defaultColumns: [
      "code",
      "recipientName",
      "currentBalance",
      "status",
      "expiresAt",
    ],
    description:
      "Gift cards sold or manually issued. Codes auto-generate on create.",
  },
  access: {
    // Admins (Users collection) can manage gift cards manually for
    // customer-support cases. Customers don't access this collection
    // directly — they redeem via a scoped /api/gift-cards/redeem
    // endpoint that runs with override.
    read: ({ req }) => req.user?.collection === "users",
    create: ({ req }) => req.user?.collection === "users",
    update: ({ req }) => req.user?.collection === "users",
    delete: ({ req }) => req.user?.collection === "users",
  },
  fields: [
    {
      name: "code",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description:
          "Unique 16-character code. Auto-generated on create — don't edit.",
        // TODO(phase 3): auto-generate via a beforeValidate hook in
        // src/lib/gift-cards/. Keep generation logic out of this file.
      },
    },
    {
      name: "initialValue",
      type: "number",
      required: true,
      min: 0,
      label: "Initial value (USD)",
      admin: {
        description:
          "The amount the gift card was purchased for. Stored as integer cents.",
        components: {
          Field: "@/components/admin/MoneyField",
          Cell: "@/components/admin/MoneyField#MoneyCell",
        },
      },
    },
    {
      name: "currentBalance",
      type: "number",
      required: true,
      min: 0,
      label: "Current balance (USD)",
      admin: {
        description:
          "Remaining balance. Decremented by the redemption system — don't edit by hand.",
        readOnly: true,
        components: {
          Field: "@/components/admin/MoneyField",
          Cell: "@/components/admin/MoneyField#MoneyCell",
        },
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Redeemed", value: "redeemed" },
        { label: "Expired", value: "expired" },
      ],
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Recipient",
          fields: [
            { name: "recipientName", type: "text", required: true },
            { name: "recipientEmail", type: "email", required: true },
            {
              name: "message",
              type: "textarea",
              admin: {
                description: "Personal note included with the gift card email.",
              },
            },
            {
              name: "deliveryDate",
              type: "date",
              admin: {
                description:
                  "When the recipient gets the email. Defaults to immediate if blank.",
                date: { pickerAppearance: "dayAndTime" },
              },
            },
          ],
        },
        {
          label: "Purchaser & expiry",
          fields: [
            {
              name: "purchaser",
              type: "relationship",
              relationTo: "customers",
              admin: {
                description: "Blank if a non-account guest bought the gift card.",
              },
            },
            {
              name: "expiresAt",
              type: "date",
              required: true,
              admin: {
                description: "Defaults to one year after purchase.",
                date: { pickerAppearance: "dayOnly" },
              },
            },
          ],
        },
      ],
    },
  ],
};

export default GiftCards;
