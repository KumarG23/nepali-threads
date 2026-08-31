# Production dependency security

Reviewed: 2026-08-31

## Supported compatibility set

The application pins the framework and image stack as one reviewed set:

- Next.js `16.3.3`
- Payload and all direct `@payloadcms/*` packages `3.88.0`
- React / React DOM `19.2.8`
- Sharp `0.35.4`

Payload 3.88.0 does not support Next 15.5.x. Do not independently downgrade or float one member of this set without checking current peer ranges, regenerating the lockfile, and rerunning the full release gates.

`patches/payload+3.88.0.patch` remains required for Payload CLI `@next/env` ESM interop under the supported Node runtime. `postinstall` applies it through `patch-package`; a clean `npm ci` must prove it still applies after every Payload update.

## Gate

```bash
npm ci
npm run audit:production
npm run check
```

`npm run audit:production` runs `npm audit --omit=dev --audit-level=high`. High and critical production advisories fail CI. Dependency changes must also inspect the complete `npm audit --omit=dev` report rather than treating the threshold gate as a clean-bill-of-health claim.

## Current audit disposition

The coordinated upgrade reduced the production audit from 19 high / 7 moderate to:

- 0 critical
- 0 high
- 6 moderate
- 1 low

### Payload / Drizzle CLI toolchain

`@payloadcms/db-postgres@3.88.0` depends on `drizzle-kit@0.31.7`, which still declares deprecated `@esbuild-kit/*` packages and their `esbuild@0.18.20`. The advisory concerns the esbuild development server accepting cross-origin requests. Nepali Threads does not run that development server in production; this path is migration/schema tooling. The stable Payload dependency set offers no supported fix.

Disposition: accepted vendor-owned moderate debt. Do not force a Drizzle beta, downgrade, or unreviewed transitive override merely to make the count read zero. Recheck when Payload adopts a Drizzle release that removes `@esbuild-kit/esm-loader`.

### Payload admin / Monaco DOMPurify

Payload UI brings `monaco-editor@0.56.0`, which declares and also bundles DOMPurify `3.4.8`. Current DOMPurify advisories are fixed in newer releases, but an npm override would only replace the dependency entry; it would not repair Monaco's bundled copy. The configured Nepali Threads collections currently contain no Payload `code` fields, so Monaco is not part of a normal content-editing path, and the admin is authenticated.

Disposition: accepted vendor-owned moderate/low debt with constrained reachability. Track Payload/Monaco releases and upgrade when the bundled DOMPurify is fixed. Do not claim an override resolves the bundled code.

## Required upgrade verification

For any change to this set:

1. Inspect exact npm package manifests and upstream release/security notes.
2. Verify Payload/Next/React peer ranges with `npm ls` and no peer problems.
3. Run a clean `npm ci`; confirm the Payload patch applies.
4. Run `npm run audit:production` and review the complete lower-severity report.
5. Run `npm run check`.
6. Run `npx payload generate:types` and `npx payload generate:importmap`; review generated diffs.
7. Exercise Sharp with a real decode/resize/encode operation.
8. Build a Vercel preview and smoke-test storefront, admin login surface, Payload API, and a real `next/image` response before merging.
9. After merge, verify production deployment and repeat the public smoke tests.

No dependency upgrade authorizes a production migration or catalog write.
