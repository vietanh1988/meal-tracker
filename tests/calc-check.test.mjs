import test from "node:test";
import assert from "node:assert/strict";
import { parseFoodLine, parseFoodText, resolveAll, sumCheck, stepItem, parseCalcAI, cacheEntryOf } from "../src/lib/calcCheck.js";

test("tách dòng: số + đơn vị đầu/cuối, chữ số lượng", () => {
  assert.deepEqual(parseFoodLine("1 tô phở bò"), { raw: "1 tô phở bò", qty: 1, unit: "tô", name: "phở bò" });
  assert.deepEqual(parseFoodLine("200g ức gà luộc"), { raw: "200g ức gà luộc", qty: 200, unit: "g", name: "ức gà luộc" });
  assert.deepEqual(parseFoodLine("Cơm trắng 1 chén"), { raw: "Cơm trắng 1 chén", qty: 1, unit: "chén", name: "cơm trắng" });
  assert.equal(parseFoodLine("hai quả trứng gà luộc").qty, 2);
  assert.equal(parseFoodLine("trà sữa").qty, null);
  assert.equal(parseFoodText("1 tô phở bò, 2 quả trứng gà luộc\n1 ly trà sữa trân châu").length, 3);
});

test("phở bò 1 tô = 400 g từ kho; trứng 2 quả = 100 g", () => {
  const r = resolveAll("1 tô phở bò, 2 quả trứng gà luộc", {});
  assert.equal(r[0].unknown, undefined);
  assert.equal(r[0].food, "phở bò");
  assert.equal(r[0].gram, 400);
  assert.equal(r[0].cal, 340);
  assert.equal(r[1].gram, 100);
  assert.equal(r[1].cal, 155);
  assert.equal(r[1].qty_display, "2 quả");
  const s = sumCheck(r);
  assert.equal(s.cal, 495);
});

test("món lạ không khớp đủ từ → unknown (mời AI), có món gần đúng", () => {
  const [x] = resolveAll("1 cái bánh bao xá xíu siêu cay đặc biệt", {});
  assert.equal(x.unknown, true);
});

test("food_cache khớp tên không dấu", () => {
  const [x] = resolveAll("200g mon la cua toi", { "món lạ của tôi": { p: 10, c: 20, f: 5, fiber: 1, cal: 165, gram: 100 } });
  assert.equal(x.source, "cache"); assert.equal(x.cal, 330); assert.equal(x.p, 20);
});

test("đổi khẩu phần: 2 quả → 3 quả, gram tăng theo", () => {
  const [egg] = resolveAll("2 quả trứng gà luộc", {});
  const up = stepItem(egg, 1);
  assert.equal(up.qty_display, "3 quả"); assert.equal(up.gram, 150);
  const g = stepItem({ food: "x", gram: 200, cal: 200, p: 10, c: 10, f: 10 }, -1);
  assert.equal(g.gram, 150); assert.equal(g.cal, 150);
});

test("đọc trả lời AI theo thứ tự, bỏ số vô lý", () => {
  const entries = parseFoodText("1 cái bánh bao xá xíu, 1 món ma");
  const out = parseCalcAI('[{"name":"bánh bao xá xíu","gram":150,"cal":330,"p":10,"c":50,"f":10,"fiber":2},{"name":"x","gram":0,"cal":1}]', entries);
  assert.equal(out[0].cal, 330); assert.equal(out[0].source, "ai"); assert.equal(out[0].qty_display, "1 cái");
  assert.equal(out[1].unknown, true);
  assert.deepEqual(cacheEntryOf(out[0]), { p: 6.7, c: 33.3, f: 6.7, fiber: 1.3, cal: 220, gram: 100 });
});
