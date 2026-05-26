import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Payload serializes Media URLs with PAYLOAD_PUBLIC_SERVER_URL prepended,
    // so even though the route /api/media/file/<filename> is same-origin
    // logically, next/image sees it as a remote URL like
    // https://nepali-threads-one.vercel.app/api/media/file/X.JPG and needs
    // the hostname in remotePatterns to optimize. Wildcards cover Vercel
    // production + preview hosts (preview URLs have unpredictable hashes).
    //
    // R2 entries kept in case we ever serve images directly from R2 (e.g.
    // via a future custom CDN domain), but currently nothing actually loads
    // from these hosts — Payload's media endpoint proxies/redirects from
    // the same-origin route.
    remotePatterns: [
      // Custom production domain (apex + www). Once
      // PAYLOAD_PUBLIC_SERVER_URL flips to https://nepali-threads.com, all
      // serialized Media URLs reference these hosts.
      { protocol: "https", hostname: "nepali-threads.com" },
      { protocol: "https", hostname: "www.nepali-threads.com" },
      // Vercel-managed hosts (production .vercel.app, preview hashed
      // subdomains). Kept so the old URL keeps working during cutover
      // and preview deploys still load images.
      { protocol: "https", hostname: "**.vercel.app" },
      // R2 entries kept in case we ever serve images directly from R2
      // (e.g. via a future custom CDN domain), but currently nothing
      // actually loads from these hosts — Payload's media endpoint
      // proxies/redirects from the same-origin route.
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "**.r2.dev" },
    ],
  },
};

export default withPayload(nextConfig);
