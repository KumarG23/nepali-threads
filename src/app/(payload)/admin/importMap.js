// Generated-ish: this file maps the string references used in
// `admin.components.{Field,Cell,...}` to the actual React components.
//
// We hand-maintain it because `payload generate:importmap` doesn't
// honour the `@/*` tsconfig path alias when invoked directly via the
// CLI. Next.js does, so the bundled admin works fine.

import { default as MoneyField } from "@/components/admin/MoneyField";
import { MoneyCell } from "@/components/admin/MoneyField";

export const importMap = {
  "@/components/admin/MoneyField": MoneyField,
  "@/components/admin/MoneyField#MoneyCell": MoneyCell,
};
