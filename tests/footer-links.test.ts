import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Footer } from "../src/components/storefront/Footer";

const UNAVAILABLE_ROUTES = [
  "/gift-cards",
  "/shipping",
  "/returns",
  "/contact",
  "/sustainability",
  "/press",
  "/privacy",
  "/terms",
];

test("does not advertise storefront routes that do not exist", () => {
  const markup = renderToStaticMarkup(React.createElement(Footer));

  for (const route of UNAVAILABLE_ROUTES) {
    assert.doesNotMatch(markup, new RegExp(`href="${route}"`));
  }
  assert.match(markup, /href="\/shop"/);
  assert.match(markup, /href="\/about"/);
});

test("does not advertise a new-arrivals filter the shop ignores", () => {
  const markup = renderToStaticMarkup(React.createElement(Footer));

  assert.doesNotMatch(markup, /href="\/shop\?filter=new"/);
  assert.match(markup, /href="\/shop"/);
});
