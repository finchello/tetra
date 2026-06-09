import test from "node:test";
import assert from "node:assert";
import { add } from "./sum.js";

test("add returns the sum", () => {
  assert.strictEqual(add(2, 3), 5);
  assert.strictEqual(add(0, 0), 0);
  assert.strictEqual(add(-1, 1), 0);
});
