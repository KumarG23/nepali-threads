import assert from "node:assert/strict";
import test from "node:test";

import { isInventoryAvailable } from "../src/lib/inventory-availability";

test("rejects a requested quantity above tracked product inventory", () => {
  assert.equal(isInventoryAvailable(0, 1), false);
  assert.equal(isInventoryAvailable(2, 3), false);
});

test("allows untracked inventory and quantities within a tracked count", () => {
  assert.equal(isInventoryAvailable(null, 50), true);
  assert.equal(isInventoryAvailable(undefined, 50), true);
  assert.equal(isInventoryAvailable(2, 2), true);
});
