// 07/11: Bảng calo đủ món — tra mọi món của kho app, món có trang riêng lên trước
import { test } from "node:test";
import assert from "node:assert/strict";
import { caloTable, tableGroup, TABLE_GROUPS } from "../lib/caloTable.js";

const F = (key, cat, extra = {}) => ({ key, slug: key.replace(/\s+/g, "-"), name: key[0].toUpperCase() + key.slice(1), cat, per100: { cal: 100 }, portions: [], ...extra });
const all = [F("chuối", "fruit"), F("phở bò", "starch"), F("dâu tây", "fruit"), F("ức gà", "poultry"), F("trứng gà", "egg_dairy"), F("sữa chua", "egg_dairy"), F("hạt điều", "nuts"), F("rau muống", "veg"), F("bánh chuối hấp", "starch"), F("nước mắm", "sauce"), F("trà sữa", "drink"), F("coca", "drink")];
const pages = [{ ...F("phở bò", "starch"), slug: "pho-bo", page: { image_url: "x" } }, { ...F("chuối", "fruit"), slug: "chuoi", page: null }];

test("nhóm: theo kiểu món trước, rồi loại thực phẩm", () => {
  const g = (k) => TABLE_GROUPS[tableGroup(all.find((x) => x.key === k))];
  assert.equal(g("phở bò"), "Món nước"); assert.equal(g("bánh chuối hấp"), "Bánh"); assert.equal(g("chuối"), "Trái cây");
  assert.equal(g("ức gà"), "Thịt, cá, trứng"); assert.equal(g("trứng gà"), "Thịt, cá, trứng"); assert.equal(g("sữa chua"), "Đồ uống");
  assert.equal(g("hạt điều"), "Sữa, hạt"); assert.equal(g("rau muống"), "Rau"); assert.equal(g("nước mắm"), "Đồ uống"); assert.equal(g("coca"), "Đồ uống");
});

test("đủ mọi món của kho, món có trang lên trước, số món mỗi nhóm khớp", () => {
  const t = caloTable(all, pages);
  assert.equal(t.total, all.length); assert.equal(t.withPage, 2); assert.equal(t.all, all.length);
  assert.deepEqual(t.list.slice(0, 2).map((x) => x.key), ["phở bò", "chuối"]);
  assert.ok(t.list.slice(2).every((x) => !x.hasPage));
  assert.equal(t.groups.reduce((s, [, , n]) => s + n, 0), all.length);
  assert.equal(t.list.find((x) => x.key === "phở bò").slug, "pho-bo");
});

test("lọc nhóm, tìm không dấu, nhóm lạ → null", () => {
  const t = caloTable(all, pages, { g: "trai-cay" });
  assert.deepEqual(t.list.map((x) => x.key), ["chuối", "dâu tây"]);
  assert.deepEqual(caloTable(all, pages, { q: "chuoi" }).list.map((x) => x.key), ["chuối", "bánh chuối hấp"]);
  assert.equal(caloTable(all, pages, { g: "khong-co" }), null);
});
