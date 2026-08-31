type CatalogReviewMedia = {
  id: number;
  filename: string;
  alt: string;
};

type CatalogReviewProduct = {
  key: string;
  slug: string;
  name: string;
  description: string;
  confidence: "high" | "medium";
  existing_product_ids: number[];
  notes: string[];
  all_media_ids: number[];
  selected_media: CatalogReviewMedia[];
};

export type CatalogReviewPlan = {
  schema_version: 1;
  plan_id: string;
  required_category: {
    id: number;
    name: string;
    slug: string;
  };
  draft_defaults: {
    status: "draft";
    featured: false;
    basePrice: 0;
    inventoryCount: null;
  };
  products: CatalogReviewProduct[];
};

export type CatalogReviewDraft = {
  name: string;
  slug: string;
  description: {
    root: {
      type: "root";
      format: "";
      indent: 0;
      version: 1;
      children: Array<{
        type: "paragraph";
        format: "";
        indent: 0;
        version: 1;
        children: Array<{
          mode: "normal";
          text: string;
          type: "text";
          style: "";
          detail: 0;
          format: 0;
          version: 1;
        }>;
        direction: null;
        textStyle: "";
        textFormat: 0;
      }>;
      direction: null;
    };
  };
  category: number;
  basePrice: 0;
  inventoryCount: null;
  images: Array<{ image: number }>;
  featured: false;
  status: "draft";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateCatalogReviewPlan(input: unknown): CatalogReviewPlan {
  if (!isRecord(input) || input.schema_version !== 1) {
    throw new Error("Catalog review plan must use schema version 1");
  }
  if (!isRecord(input.required_category)) {
    throw new Error("Catalog review plan requires a category");
  }
  if (!isRecord(input.draft_defaults)) {
    throw new Error("Catalog review plan requires draft defaults");
  }
  if (
    input.draft_defaults.status !== "draft" ||
    input.draft_defaults.featured !== false ||
    input.draft_defaults.basePrice !== 0 ||
    input.draft_defaults.inventoryCount !== null
  ) {
    throw new Error("Catalog review plan must remain draft-only and zero-price");
  }
  if (!Array.isArray(input.products) || input.products.length === 0) {
    throw new Error("Catalog review plan contains no products");
  }

  const slugs = new Set<string>();
  const selectedMediaOwners = new Map<number, string>();
  for (const product of input.products) {
    if (
      !isRecord(product) ||
      typeof product.key !== "string" ||
      typeof product.slug !== "string" ||
      typeof product.name !== "string" ||
      typeof product.description !== "string" ||
      !Array.isArray(product.all_media_ids) ||
      !Array.isArray(product.selected_media)
    ) {
      throw new Error("Catalog review plan contains an invalid product");
    }
    if (!product.slug.startsWith("catalog-review-")) {
      throw new Error(`product slug ${product.slug} is outside catalog review scope`);
    }
    if (slugs.has(product.slug)) {
      throw new Error(`duplicate product slug ${product.slug}`);
    }
    slugs.add(product.slug);

    const allMediaIDs = new Set<number>();
    for (const mediaID of product.all_media_ids) {
      if (!Number.isSafeInteger(mediaID) || mediaID <= 0) {
        throw new Error(`invalid media ID for ${product.key}`);
      }
      allMediaIDs.add(mediaID);
    }
    for (const media of product.selected_media) {
      if (
        !isRecord(media) ||
        !Number.isSafeInteger(media.id) ||
        typeof media.filename !== "string" ||
        !media.filename ||
        typeof media.alt !== "string" ||
        !media.alt
      ) {
        throw new Error(`invalid selected media for ${product.key}`);
      }
      const mediaID = media.id as number;
      if (!allMediaIDs.has(mediaID)) {
        throw new Error(`selected media ${media.id} is not part of ${product.key}`);
      }
      const existingOwner = selectedMediaOwners.get(mediaID);
      if (existingOwner) {
        throw new Error(
          `selected media ${mediaID} is assigned to both ${existingOwner} and ${product.key}`
        );
      }
      selectedMediaOwners.set(mediaID, product.key);
    }
  }

  return input as CatalogReviewPlan;
}

function descriptionToLexical(text: string): CatalogReviewDraft["description"] {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      children: [
        {
          type: "paragraph",
          format: "",
          indent: 0,
          version: 1,
          children: [
            {
              mode: "normal",
              text,
              type: "text",
              style: "",
              detail: 0,
              format: 0,
              version: 1,
            },
          ],
          direction: null,
          textStyle: "",
          textFormat: 0,
        },
      ],
      direction: null,
    },
  };
}

export type CatalogReviewCard = {
  key: string;
  name: string;
  description: string;
  confidence: "high" | "medium";
  selectedPhotoCount: number;
  groupedPhotoCount: number;
  photoURLs: string[];
  notes: string[];
};

export function buildCatalogReviewCards(
  plan: CatalogReviewPlan
): CatalogReviewCard[] {
  return plan.products.map((product) => ({
    key: product.key,
    name: product.name,
    description: product.description,
    confidence: product.confidence,
    selectedPhotoCount: product.selected_media.length,
    groupedPhotoCount: product.all_media_ids.length,
    photoURLs: product.selected_media.map(
      (media) => `/api/media/file/${encodeURIComponent(media.filename)}`
    ),
    notes: product.notes,
  }));
}

export function buildCatalogReviewDrafts(
  plan: CatalogReviewPlan
): CatalogReviewDraft[] {
  return plan.products.map((product) => ({
    name: product.name,
    slug: product.slug,
    description: descriptionToLexical(product.description),
    category: plan.required_category.id,
    basePrice: 0,
    inventoryCount: null,
    images: product.selected_media.map((media) => ({ image: media.id })),
    featured: false,
    status: "draft",
  }));
}
