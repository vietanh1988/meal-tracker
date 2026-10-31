import test from "node:test";
import assert from "node:assert/strict";
import { dayWarnings } from "../src/lib/dayWarn.js";

const it = (cal, p, c, f, fiber = 0) => ({ name: "x", gram: 100, cal, p, c, f, fiber });
const T = { cal: 2515, p: 130, c: 339, f: 71, fiber: 35 };

test("đủ bữa, vượt 138 kcal: vàng cam, béo đứng đầu, chỉ ra bữa nhiều béo nhất, xơ thiếu, đạm hơi dư (ngày tập)", () => {
  const rows = [{ name: "Bữa sáng", state: "eaten", items: [it(467, 30, 50, 15)] }, { name: "Bữa trưa", state: "eaten", items: [it(1084, 60, 90, 61)] }];
  const w = dayWarnings({ eaten: { cal: 2653, p: 152, c: 215, f: 129, fiber: 9 }, targets: T, bmr: 1700, train: true, rows, done: true });
  assert.equal(w.tone, "warn"); assert.equal(w.full, true);
  assert.equal(w.label, "ĐỦ BỮA · VƯỢT 138 KCAL");
  assert.deepEqual(w.rows.map((r) => r.k), ["f", "fiber", "p_high"]);
  assert.match(w.rows[0].sub, /^Bữa trưa nhiều béo nhất \(61g\)/);
  assert.equal(w.rows[2].tone, "grey"); assert.match(w.rows[2].sub, /Ngày tập/);
  assert.equal(w.action, null);
});
test("giảm cân ăn dưới BMR khi đủ bữa: đỏ + nút Thêm bữa phụ", () => {
  const w = dayWarnings({ eaten: { cal: 1120, p: 62, c: 120, f: 40, fiber: 30 }, targets: { cal: 1650, p: 100, c: 150, f: 50, fiber: 30 }, bmr: 1450, rows: [], done: true });
  assert.equal(w.tone, "bad"); assert.equal(w.label, "ĐỦ BỮA · ĂN QUÁ ÍT");
  assert.equal(w.rows[0].k, "kcal"); assert.equal(w.rows[0].val, "1.120/1.450");
  assert.equal(w.rows[1].k, "p_low");
  assert.deepEqual(w.action, { act: "snack", label: "Thêm bữa phụ" });
});
test("đang ăn dở mà đã vượt: thẻ gọn, gợi ý bữa kế ăn nhẹ; chưa vượt thì không có gì", () => {
  const rows = [{ name: "Bữa trưa", state: "eaten", items: [] }, { name: "Bữa tối", state: "planned", items: [] }];
  const w = dayWarnings({ eaten: { cal: 2725, p: 100, c: 300, f: 90, fiber: 5 }, targets: T, bmr: 1700, rows, done: false, nowMinutes: 15 * 60 });
  assert.equal(w.full, false); assert.equal(w.label, "ĐÃ VƯỢT 210 KCAL · CÒN 1 BỮA");
  assert.equal(w.rows[0].title, "Bữa tối ăn nhẹ thôi");
  assert.equal(dayWarnings({ eaten: { cal: 1500, p: 60, c: 200, f: 90, fiber: 5 }, targets: T, bmr: 1700, rows, done: false, nowMinutes: 15 * 60 }), null);
});
test("ngưỡng vượt: 5% và 100 kcal; > 20% thành đỏ; ăn dở từ 21:00 dưới BMR vẫn báo", () => {
  const ok = dayWarnings({ eaten: { cal: 2600, p: 130, c: 339, f: 71, fiber: 35 }, targets: T, bmr: 1700, done: true });
  assert.equal(ok.tone, "ok"); assert.equal(ok.rows.length, 0); assert.equal(ok.label, "ĐÃ GHI ĐỦ BỮA");
  assert.equal(dayWarnings({ eaten: { cal: 3100, p: 130, c: 339, f: 71, fiber: 35 }, targets: T, bmr: 1700, done: true }).tone, "bad");
  const late = dayWarnings({ eaten: { cal: 900, p: 50, c: 100, f: 30, fiber: 10 }, targets: T, bmr: 1700, done: false, nowMinutes: 21 * 60 + 5 });
  assert.equal(late.tone, "bad"); assert.equal(late.rows[0].k, "kcal");
});
test("ngày cũ: nhãn NGÀY ĐÓ, không có nút; tối đa 3 dòng", () => {
  const w = dayWarnings({ eaten: { cal: 2900, p: 300, c: 500, f: 120, fiber: 2 }, targets: T, bmr: 1700, done: true, isToday: false });
  assert.match(w.label, /^NGÀY ĐÓ · VƯỢT/); assert.equal(w.rows.length, 3); assert.equal(w.action, null);
  assert.deepEqual(w.rows.map((r) => r.k), ["f", "c", "fiber"]);
});
