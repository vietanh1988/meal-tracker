import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { layerOrder } from "../src/pi/layerOrder.js";
const man = JSON.parse(readFileSync("src/pi/manifest.json", "utf8")), order = man.order;

test("mũ trùm đầu → không có lá", () => {
  assert.ok(!layerOrder({ dau: { cover: true } }, order).includes("la"));
});
test("vương miện / băng đô → lá ngay dưới món", () => {
  const o = layerOrder({ dau: { cover: false } }, order);
  assert.equal(o.indexOf("la") + 1, o.indexOf("dau"));
});
test("không đội gì → giữ thứ tự manifest", () => {
  assert.deepEqual(layerOrder({ ao: {} }, order), order);
  assert.deepEqual(layerOrder(null, order), order);
});
test("manifest: mũ trùm có cover, băng đô / vương miện thì không", () => {
  const dau = man.items.filter((x) => x.slot === "dau");
  assert.ok(dau.filter((x) => x.cover).length >= 30);
  for (const x of dau) if (/^(vương miện|băng đô)/i.test(x.name)) assert.ok(!x.cover, x.id);
  for (const x of dau) if (/^(mũ|nón)/i.test(x.name)) assert.ok(x.cover, x.id);
});
