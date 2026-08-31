import config from "@payload-config";
import { createLocalReq, getPayload } from "payload";

import catalogReviewPlan from "@/data/catalog-review-plan.json" with {
  type: "json",
};
import {
  applyCatalogReviewDrafts,
  CatalogReviewPreflightError,
  type CatalogReviewPayload,
} from "@/lib/catalog-review/import";
import { validateCatalogReviewPlan } from "@/lib/catalog-review/plan";

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  let configuredOrigin: string | null = null;
  try {
    configuredOrigin = new URL(
      process.env.PAYLOAD_PUBLIC_SERVER_URL || ""
    ).origin;
  } catch {
    // Fail closed when the deployment has no canonical public origin.
  }
  if (!configuredOrigin || origin !== configuredOrigin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });

  if (!user || user.collection !== "users") {
    return Response.json({ error: "Admin sign-in required." }, { status: 401 });
  }
  if (user.role !== "admin" && user.role !== "super-admin") {
    return Response.json(
      { error: "Catalog review requires an admin account." },
      { status: 403 }
    );
  }

  try {
    const req = await createLocalReq({ user }, payload);
    const result = await applyCatalogReviewDrafts({
      payload: payload as unknown as CatalogReviewPayload,
      plan: validateCatalogReviewPlan(catalogReviewPlan),
      req: req as unknown as Record<string, unknown>,
    });

    return Response.json({
      created: result.created.length,
      preserved: result.preserved.length,
      drafts: result.drafts.length,
      reviewUrl: "/admin/collections/products",
    });
  } catch (error) {
    if (error instanceof CatalogReviewPreflightError) {
      return Response.json(
        {
          error:
            "Catalog changed since the photo scan. Refresh the review plan before importing.",
        },
        { status: 409 }
      );
    }
    return Response.json(
      { error: "Draft import failed without publishing any products." },
      { status: 500 }
    );
  }
}
