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
  assert.deepEqual(cacheEntryOf(out[0], 1), { p: 10, c: 50, f: 10, fiber: 2, cal: 330, gram: 150 });
});

test("món AI đã lưu: gõ lại '2 tô' nhân đúng khẩu phần đã tính, không về 100 g", () => {
  const entries = parseFoodText("1 tô bún mắm nêm đặc biệt");
  const [ai] = parseCalcAI('[{"name":"bún mắm nêm đặc biệt","gram":500,"cal":600,"p":30,"c":70,"f":20,"fiber":3}]', entries);
  const cache = { "bún mắm nêm đặc biệt": cacheEntryOf(ai, entries[0].qty) };
  const [again] = resolveAll("1 tô bún mắm nêm đặc biệt", cache);
  assert.equal(again.source, "cache"); assert.equal(again.gram, 500); assert.equal(again.cal, 600);
  const [two] = resolveAll("2 tô bún mắm nêm đặc biệt", cache);
  assert.equal(two.gram, 1000); assert.equal(two.cal, 1200);
});
test("chữ số lượng chỉ tính khi có đơn vị; có 'ổ'", () => {
  assert.equal(parseFoodLine("ba chỉ nướng").name, "ba chỉ nướng");
  assert.equal(parseFoodLine("ba chỉ nướng").qty, null);
  const b = parseFoodLine("nửa ổ bánh mì");
  assert.equal(b.qty, 0.5); assert.equal(b.unit, "ổ"); assert.equal(b.name, "bánh mì");
  assert.equal(parseFoodLine("hai quả trứng gà luộc").qty, 2);
});

test("món không có trong kho (gốc + cách chế biến) giữ tên gõ, đánh dấu Ước tính (16/10)", async () => {
  const { resolveAll } = await import("../src/lib/calcCheck.js");
  const [a] = resolveAll("thịt lợn xào", {});
  assert.equal(a.display, "Thịt lợn xào");
  assert.equal(a.source, "estimate");
  const [b] = resolveAll("trứng rán", {});
  assert.ok(!/luộc/i.test(b.display), b.display);
});

test("tự nhập calo món lạ (16/10)", async () => {
  const { manualItem } = await import("../src/lib/calcCheck.js");
  const e = parseFoodLine("2 cái bánh khọt");
  const it = manualItem(e, { gram: 120, cal: 260, p: "6,5", c: 30, f: "" });
  assert.equal(it.display, "Bánh khọt");
  assert.equal(it.source, "manual");
  assert.equal(it.p, 6.5);
  assert.equal(it.f, 0);
  assert.equal(it.qty_display, "2 cái");
  assert.equal(manualItem(e, { gram: 100, cal: 0 }), null);
  assert.equal(manualItem(e, { gram: 0, cal: 200 }), null);
});

test("ô tìm Ghi bữa: nhận ra gõ cả bữa (113b)", async () => {
  const { mealEntries, mineEntries, manualItem } = await import("../src/lib/calcCheck.js");
  assert.equal(mealEntries("phở bò"), null);
  assert.equal(mealEntries("cơm trắng"), null);
  assert.equal(mealEntries("thịt heo"), null);
  assert.equal(mealEntries("1 tô phở bò, 2 quả trứng gà luộc").length, 2);
  assert.equal(mealEntries("200g ức gà").length, 1);
  { const m = mealEntries("1 tô"); assert.ok(m === null || m.length === 1); }
  assert.equal(mealEntries("cơm và gà luộc").length, 2);
  assert.equal(mealEntries("phở bò\ntrà đá").length, 2);
  // món tự nhập "2 cái" → lưu theo 1 cái
  const it = manualItem(parseFoodLine("2 cái bánh khọt"), { gram: 200, cal: 260 });
  const mine = mineEntries([it, { source: "localDB", food: "x", gram: 1, cal: 1 }]);
  assert.deepEqual(Object.keys(mine), ["bánh khọt"]);
  assert.equal(mine["bánh khọt"].cal, 130);
  assert.equal(mine["bánh khọt"].gram, 100);
});

test("21/10: '4 trứng 200g' / '4 quả trứng 200g' lấy gram ghi cuối, số đầu là số cái", () => {
  for (const t of ["4 trứng 200g", "4 quả trứng 200g", "4 trứng 200 gam"]) {
    const [it] = resolveAll(t, {});
    assert.equal(it.food, "trứng gà luộc", t);
    assert.equal(it.gram, 200, t);
    assert.equal(it.cal, 310, t);
  }
});
