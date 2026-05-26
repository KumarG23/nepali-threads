import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/cart"],
    },
    sitemap: "https://nepali-threads.com/sitemap.xml",
  };
}
