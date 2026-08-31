import assert from "node:assert/strict";
import { mock, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

type ModuleMock = (
  specifier: string,
  options: { defaultExport?: unknown; namedExports?: Record<string, unknown> }
) => void;
const mockModule = (mock as unknown as { module: ModuleMock }).module.bind(mock);
(globalThis as typeof globalThis & { React: typeof React }).React = React;

mockModule("@payload-config", { defaultExport: {} });
mockModule("payload", {
  namedExports: {
    getPayload: async () => ({
      find: async () => ({ docs: [] }),
    }),
  },
});

const { default: ShopPage } = await import(
  "../src/app/(frontend)/shop/page"
);

test("empty shop gives an honest invitation to check back", async () => {
  const markup = renderToStaticMarkup(await ShopPage());

  assert.match(markup, /Check back soon for new pieces\./);
  assert.doesNotMatch(markup, /sign up|newsletter/i);
});
