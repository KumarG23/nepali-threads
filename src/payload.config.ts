// LOCAL-LLM: DO NOT EDIT
import path from "path";
import { fileURLToPath } from "url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Categories } from "@/collections/Categories";
import { Customers } from "@/collections/Customers";
import { GiftCardRedemptions } from "@/collections/GiftCardRedemptions";
import { GiftCards } from "@/collections/GiftCards";
import { Media } from "@/collections/Media";
import { Orders } from "@/collections/Orders";
import { ProductVariants } from "@/collections/ProductVariants";
import { Products } from "@/collections/Products";
import { Users } from "@/collections/Users";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Customers,
    Media,
    Categories,
    Products,
    ProductVariants,
    Orders,
    GiftCards,
    GiftCardRedemptions,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    // Neon connection string includes `sslmode=require`, so node-postgres
    // negotiates TLS automatically — no extra ssl block needed.
    pool: {
      connectionString: process.env.DATABASE_URL || "",
    },
    // Auto-sync schema on boot. Payload defaults this to true in dev and
    // false in production; we force it on through Phase 3 because the Neon
    // DB starts empty and `npx payload migrate` doesn't resolve the @/*
    // alias (same issue as generate:importmap). Flip OFF in Phase 4 before
    // launch — `push: true` lets the running app mutate schema, which is
    // unsafe once real customer data exists.
    push: true,
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: true,
      },
      bucket: process.env.S3_BUCKET || "",
      config: {
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
        },
        region: process.env.S3_REGION || "auto",
        // R2 requires path-style URLs (virtual-host style isn't supported).
        forcePathStyle: true,
      },
    }),
  ],
});
