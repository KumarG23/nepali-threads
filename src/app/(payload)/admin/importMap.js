// Generated-ish: this file maps the string references used in
// `admin.components.{Field,Cell,...}` to the actual React components.
//
// We hand-maintain it because `payload generate:importmap` doesn't
// honour the `@/*` tsconfig path alias when invoked directly via the
// CLI (confirmed again 2026-05-18: it errors with
// ERR_MODULE_NOT_FOUND on `@/collections` before it can write).
// Next.js does, so the bundled admin works fine.

import { S3ClientUploadHandler } from "@payloadcms/storage-s3/client";

import { default as MoneyField } from "@/components/admin/MoneyField";
import { MoneyCell } from "@/components/admin/MoneyField";

export const importMap = {
  "@payloadcms/storage-s3/client#S3ClientUploadHandler":
    S3ClientUploadHandler,
  "@/components/admin/MoneyField": MoneyField,
  "@/components/admin/MoneyField#MoneyCell": MoneyCell,
};
