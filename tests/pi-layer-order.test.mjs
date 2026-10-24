import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { layerOrder } from "../src/pi/layerOrder.js";
const order = JSON.parse(readFileSync("src/pi/manifest.json", "utf8")).order;

test("đội mũ → lá nằm ngay dưới mũ", () => {
  const o = layerOrder({ dau: { id: "x" } }, order);
  assert.equal(o.length, order.length);
  assert.equal(o.indexOf("la") + 1, o.indexOf("dau"));
});
test("không đội mũ → giữ thứ tự manifest (lá trên mũ không có)", () => {
  assert.deepEqual(layerOrder({ ao: {} }, order), order);
  assert.deepEqual(layerOrder(null, order), order);
});
