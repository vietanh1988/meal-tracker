import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { layerOrder } from "../src/pi/layerOrder.js";
const man = JSON.parse(readFileSync("src/pi/manifest.json", "utf8")), order = man.order;

test("mũ vẽ riêng trùm đầu (cover) → không có lá", () => {
  assert.ok(!layerOrder({ dau: { cover: true } }, order).includes("la"));
});
test("mũ cũ / băng đô / không đội → giữ thứ tự manifest (lá đè lên)", () => {
  assert.deepEqual(layerOrder({ dau: { cover: false } }, order), order);
  assert.deepEqual(layerOrder({ ao: {} }, order), order);
  assert.deepEqual(layerOrder(null, order), order);
});
test("manifest: chỉ mũ vẽ riêng có cover, băng đô / vương miện không bao giờ", () => {
  const dau = man.items.filter((x) => x.slot === "dau");
  for (const x of dau) if (/^(vương miện|băng đô|kẹp|cài|trâm)/i.test(x.name)) assert.ok(!x.cover, x.id);
  for (const id of ["giangsinh-nam-dau01", "muahe-nam-dau03", "muahe-nu-dau01", "muadong-nu-dau01"]) assert.ok(dau.find((x) => x.id === id)?.cover, id);
});
