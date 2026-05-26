// LOCAL-LLM: DO NOT EDIT
//
// Links unclaimed guest orders to a verified customer after email ownership is
// proven. This must not run on signup alone; email-squatting would expose old
// guest orders to the wrong account.

import type { Payload } from "payload";

export async function claimGuestOrdersForVerifiedCustomer({
  payload,
  customerId,
  email,
}: {
  payload: Payload;
  customerId: number;
  email: string;
}): Promise<number> {
  const result = await payload.find({
    collection: "orders",
    where: {
      and: [
        { customer: { equals: null } },
        { guestEmail: { equals: email } },
      ],
    },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  let claimed = 0;
  for (const order of result.docs) {
    await payload.update({
      collection: "orders",
      id: order.id,
      data: { customer: customerId },
      overrideAccess: true,
    });
    claimed += 1;
  }

  return claimed;
}
