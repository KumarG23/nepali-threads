// LOCAL-LLM: DO NOT EDIT
import type { CollectionConfig, Field } from "payload";

// Money fields are stored as INTEGER CENTS. MoneyField / MoneyCell handle
// the dollar ↔ cents conversion in the admin UI only — API responses and
// webhook writes use cents directly.
const moneyField = {
  admin: {
    components: {
      Field: "@/components/admin/MoneyField",
      Cell: "@/components/admin/MoneyField#MoneyCell",
    },
  },
} as const;

// Reusable address shape for shippingAddress / billingAddress on an
// order. Kept inline (not factored out) so the schema is greppable
// per-file. If you change the shape, also update Customers.addresses.
const orderAddressFields: Field[] = [
  { name: "recipientName", type: "text", required: true },
  { name: "line1", type: "text", required: true },
  { name: "line2", type: "text" },
  { name: "city", type: "text", required: true },
  { name: "region", type: "text", required: true, label: "State / Region" },
  { name: "postalCode", type: "text", required: true },
  { name: "country", type: "text", required: true, defaultValue: "US" },
  { name: "phone", type: "text" },
];

export const Orders: CollectionConfig = {
  slug: "orders",
  admin: {
    useAsTitle: "id",
    defaultColumns: [
      "id",
      "status",
      "fulfillmentStatus",
      "customer",
      "total",
      "createdAt",
    ],
    description:
      "All purchases. Created automatically by the Stripe webhook — don't add orders by hand.",
  },
  access: {
    // TODO(phase 2): customers should read their own orders via a
    // scoped query (filter by customer === req.user.id) on the
    // storefront. For now: admin only.
    read: ({ req }) => req.user?.collection === "users",
    create: ({ req }) => req.user?.collection === "users",
    update: ({ req }) => req.user?.collection === "users",
    delete: () => false, // never delete an order; refund / cancel instead
  },
  fields: [
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Paid", value: "paid" },
        { label: "Failed", value: "failed" },
        { label: "Refunded", value: "refunded" },
      ],
      admin: { description: "Payment status. Set by the Stripe webhook." },
    },
    {
      name: "fulfillmentStatus",
      type: "select",
      required: true,
      defaultValue: "unfulfilled",
      options: [
        { label: "Unfulfilled", value: "unfulfilled" },
        { label: "Processing", value: "processing" },
        { label: "Shipped", value: "shipped" },
        { label: "Delivered", value: "delivered" },
        { label: "Cancelled", value: "cancelled" },
      ],
      admin: { description: "Where the package is. Update this as you ship." },
    },
    {
      name: "customer",
      type: "relationship",
      relationTo: "customers",
      // Nullable on purpose — guest checkouts will leave this blank.
      admin: { description: "Blank for guest checkouts." },
    },
    {
      name: "guestEmail",
      type: "email",
      admin: {
        description: "Email used at checkout when there was no customer account.",
        condition: (data) => !data.customer,
      },
    },
    {
      name: "lineItems",
      type: "array",
      labels: { singular: "Line item", plural: "Line items" },
      minRows: 1,
      // Snapshot fields (nameSnapshot, skuSnapshot, priceAtPurchase) preserve
      // what the customer actually bought even if the product is later
      // edited or deleted.
      fields: [
        { name: "product", type: "relationship", relationTo: "products", required: true },
        { name: "variant", type: "relationship", relationTo: "product-variants" },
        { name: "nameSnapshot", type: "text", required: true },
        { name: "skuSnapshot", type: "text" },
        { name: "quantity", type: "number", required: true, min: 1, defaultValue: 1 },
        {
          name: "priceAtPurchase",
          type: "number",
          required: true,
          min: 0,
          label: "Price at purchase (USD)",
          admin: {
            ...moneyField.admin,
            description:
              "What the customer paid per unit. Stored as integer cents.",
          },
        },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "subtotal", type: "number", required: true, min: 0, label: "Subtotal (USD)", admin: moneyField.admin },
        { name: "tax", type: "number", required: true, min: 0, defaultValue: 0, label: "Tax (USD)", admin: moneyField.admin },
        { name: "shipping", type: "number", required: true, min: 0, defaultValue: 0, label: "Shipping (USD)", admin: moneyField.admin },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "giftCardDiscount",
          type: "number",
          required: true,
          min: 0,
          defaultValue: 0,
          label: "Gift card discount (USD)",
          admin: moneyField.admin,
        },
        { name: "total", type: "number", required: true, min: 0, label: "Total (USD)", admin: moneyField.admin },
      ],
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Shipping address",
          fields: [{ name: "shippingAddress", type: "group", fields: orderAddressFields }],
        },
        {
          label: "Billing address",
          fields: [{ name: "billingAddress", type: "group", fields: orderAddressFields }],
        },
        {
          label: "Tracking",
          fields: [
            { name: "trackingNumber", type: "text" },
            { name: "carrier", type: "text", admin: { description: "e.g. USPS, UPS, FedEx" } },
          ],
        },
        {
          label: "Payment",
          description: "Stripe payment details — set by the webhook, don't edit by hand.",
          fields: [
            {
              name: "stripePaymentIntentId",
              type: "text",
              index: true,
              admin: { readOnly: true },
            },
          ],
        },
      ],
    },
  ],
};

export default Orders;
