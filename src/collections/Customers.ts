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
  hooks: {
    afterChange: [
      // Guest-order claim: when a new Customer is created (signup),
      // backfill any past guest orders matching their email by setting
      // Order.customer = new Customer.id. After this, /account/orders
      // shows their full history including orders placed before signup.
      //
      // Email match is the same trust boundary guest-checkout already
      // uses implicitly (Stripe collects the email, confirmation lands
      // in that inbox). Fires ONLY on create — profile updates don't
      // re-trigger, so a bad actor can't change their email to absorb
      // someone else's orders.
      async ({ doc, operation, req }) => {
        if (operation !== "create") return;
        const email = doc.email;
        if (!email) return;

        const newCustomerId = doc.id;
        if (typeof newCustomerId !== "number") {
          req.payload.logger.warn(
            { customerId: doc.id },
            "[guest-order-claim] Skipping: customer id is not a number (unexpected on Postgres)"
          );
          return;
        }

        // Find unlinked guest orders with the same email.
        const result = await req.payload.find({
          collection: "orders",
          where: {
            and: [
              { customer: { equals: null } },
              { guestEmail: { equals: email } },
            ],
          },
          limit: 100,
          depth: 0,
        });

        if (result.docs.length === 0) return;

        // Sequential updates — order count per customer is small and
        // Payload's update is fast enough that parallelism isn't worth
        // the added complexity. overrideAccess: true is required
        // because Orders.update is admin-only — this hook is system
        // code, not a customer-initiated update.
        let claimed = 0;
        for (const order of result.docs) {
          try {
            await req.payload.update({
              collection: "orders",
              id: order.id,
              data: { customer: newCustomerId },
              overrideAccess: true,
            });
            claimed += 1;
          } catch (err) {
            req.payload.logger.error(
              { orderId: order.id, customerId: newCustomerId, err },
              "[guest-order-claim] Failed to claim guest order"
            );
          }
        }

        req.payload.logger.info(
          { customerId: newCustomerId, email, claimed },
          "[guest-order-claim] Backfilled guest orders on signup"
        );
      },
    ],
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
