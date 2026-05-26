import type { MetadataRoute } from "next";
import { getPayload } from "payload";

import config from "@payload-config";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nepali-threads.com").replace(
  /\/$/,
  ""
);

function staticRoutes(now: Date): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/shop`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}

function payloadEnvAvailable(): boolean {
  return Boolean(process.env.PAYLOAD_SECRET && process.env.DATABASE_URL);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes = staticRoutes(now);

  // Keep local/preview builds from failing when Payload secrets or DB access
  // are intentionally absent. Production with proper env still gets dynamic
  // product/category/page entries below.
  if (!payloadEnvAvailable()) return routes;

  try {
    const payload = await getPayload({ config });

    const products = await payload.find({
      collection: "products",
      where: { status: { equals: "published" } },
      limit: 1000,
      depth: 0,
    });
    const productRoutes: MetadataRoute.Sitemap = products.docs.map((p) => ({
      url: `${BASE_URL}/products/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    const categories = await payload.find({
      collection: "categories",
      limit: 1000,
      depth: 0,
    });
    const categoryRoutes: MetadataRoute.Sitemap = categories.docs.map((c) => ({
      url: `${BASE_URL}/categories/${c.slug}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    const pages = await payload.find({
      collection: "pages",
      limit: 1000,
      depth: 0,
    });
    const pageRoutes: MetadataRoute.Sitemap = pages.docs.map((page) => ({
      url: `${BASE_URL}/${page.slug}`,
      lastModified: page.updatedAt ? new Date(page.updatedAt) : now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

    return [...routes, ...productRoutes, ...categoryRoutes, ...pageRoutes];
  } catch (err) {
    console.error("[sitemap] Falling back to static routes", err);
    return routes;
  }
}
