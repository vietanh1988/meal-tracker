import { test } from "node:test";
import assert from "node:assert/strict";
import { macroState } from "../src/lib/mobileView.js";

test("macroState: bình thường / vượt / thiếu chỉ khi ngày đã xong", () => {
  assert.equal(macroState(50, 100, false), "ok");
  assert.equal(macroState(50, 100, true), "under");
  assert.equal(macroState(95, 100, true), "ok");
  assert.equal(macroState(111, 100, false), "over");
  assert.equal(macroState(110, 100, true), "ok");
  assert.equal(macroState(10, 0, true), "ok");
});
