// 31/10 giỏ Ghi bữa theo đơn vị (src/lib/trayPortion.js): đọc / đổi / bước khẩu phần, nhập gram.
import test from "node:test";
import assert from "node:assert/strict";
import { portionOptions, optionsFor, readPortion, stepPortion, pickPortion, gramPortion, fmtQty } from "../src/lib/trayPortion.js";
import { itemFromLocal, defaultPortion } from "../src/lib/mobileView.js";

const add = (k) => { const d = defaultPortion(k); return itemFromLocal(k, d.gram, d.label); };

test("khẩu phần từ kho: đơn vị đếm gộp 1 dòng, cỡ giữ nguyên", () => {
  assert.deepEqual(portionOptions("trứng gà"), [{ u: "quả", g: 50 }]);
  assert.deepEqual(portionOptions("cơm trắng").map((o) => o.u), ["chén nhỏ", "chén vừa", "chén đầy", "bát"]);
  assert.deepEqual(portionOptions("thịt heo luộc"), []);
  assert.deepEqual(optionsFor({ food: "món lạ AI", unit: "bát", unit_g: 300 }), [{ u: "bát", g: 300 }]);
});

test("trứng: 1 quả → + 2 quả → − 1 quả → − ½ quả → − vẫn ½ (không xoá)", () => {
  let it = add("trứng gà");
  assert.deepEqual(readPortion(it), { n: 1, u: "quả", g: 50 });
  it = stepPortion(it, 1); assert.equal(it.qty_display, "2 quả"); assert.equal(it.gram, 100);
  it = stepPortion(it, -1); assert.equal(it.qty_display, "1 quả"); assert.equal(it.gram, 50);
  it = stepPortion(it, -1); assert.equal(it.qty_display, "½ quả"); assert.equal(it.gram, 25);
  assert.equal(stepPortion(it, -1), it);
  it = stepPortion(it, 1); assert.equal(it.qty_display, "1 quả");
});

test("cơm: đổi cỡ giữ số lượng, calo tính lại", () => {
  let it = add("cơm trắng");
  it = pickPortion(it, { u: "chén vừa", g: 150 }); assert.equal(it.qty_display, "1 chén vừa"); assert.equal(it.gram, 150);
  it = stepPortion(it, 1); assert.equal(it.qty_display, "2 chén vừa"); assert.equal(it.gram, 300);
  const cal2 = it.cal;
  it = pickPortion(it, { u: "bát", g: 250 }); assert.equal(it.qty_display, "2 bát"); assert.equal(it.gram, 500);
  assert.ok(it.cal > cal2);
});

test("nhập gram: bỏ khẩu phần, − / + theo gram; món không đơn vị vẫn gram", () => {
  let it = gramPortion(add("trứng gà"), 180);
  assert.equal(readPortion(it), null); assert.equal(it.gram, 180); assert.equal(it.qty_display, undefined);
  it = pickPortion(it, { u: "quả", g: 50 }); assert.equal(it.qty_display, "1 quả"); assert.equal(it.unit_mode, undefined);
  const h = add("thịt heo luộc");
  assert.equal(readPortion(h), null);
  assert.equal(stepPortion(h, 1).gram, 125);
  assert.equal(fmtQty(1.5), "1,5");
});
