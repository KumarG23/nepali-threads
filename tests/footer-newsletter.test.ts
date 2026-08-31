import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { FooterNewsletter } from "../src/components/storefront/_footer-newsletter";

test("does not render a newsletter form without a real subscription handler", () => {
  const markup = renderToStaticMarkup(React.createElement(FooterNewsletter, {}));

  assert.doesNotMatch(markup, /<form/);
  assert.match(markup, /Newsletter updates are coming soon/);
});
