import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow next/image to load Media uploads from Cloudflare R2. Wildcards
    // cover both the direct S3-API host (uploads land here via the signed-
    // URL pipeline configured in payload.config.ts) and r2.dev public dev
    // hosts. If we later put a custom domain (e.g. media.nepali-threads.com)
    // in front of the bucket, add it here too.
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "**.r2.dev" },
    ],
  },
};

export default withPayload(nextConfig);
