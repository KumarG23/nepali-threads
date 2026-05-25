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
      { protocol: "https", hostname: "**.vercel.app" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "**.r2.dev" },
    ],
  },
};

export default withPayload(nextConfig);
