// LOCAL-LLM: DO NOT EDIT
//
// Server-side Stripe SDK instance. Read by /api/checkout (session creation)
// and /cart/success (session retrieval + Order persistence). Do not import
// from client components — the secret key is server-only.

import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error(
    "STRIPE_SECRET_KEY is not set. Add it to .env.local for local dev and to Vercel's environment variables for production."
  );
}

// Intentionally NOT pinning apiVersion — the SDK uses the account's
// current version (set in Stripe Dashboard → Developers → API version),
// which is the recommended pattern. Pinning a date here without knowing
// the active dashboard version risks API/SDK drift.
export const stripe = new Stripe(secretKey);
