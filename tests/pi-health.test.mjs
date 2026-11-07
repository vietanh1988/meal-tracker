import test from "node:test";
import assert from "node:assert/strict";
import { healthOf, healthLine, dayDone, HEALTH } from "../src/lib/piHealth.js";
import { addDays } from "../src/lib/dateVN.js";

const T = "2026-11-08";
const meal = (id, cal, p) => ({ meal_id: id, items: [{ name: "x", cal, p, c: 0, f: 0 }] });
const day = (d, n, p = 20) => ({ log_date: d, meals: ["sang", "trua", "toi"].slice(0, n).map((id) => meal(id, 500, p)), eaten_meals: ["sang", "trua", "toi"].slice(0, n) });
const empty = (d) => ({ log_date: d, meals: [], eaten_meals: [] });

test("chưa có ngày nào: 50%, hôm nay chưa ghi → gợi ý ghi bữa đầu", () => {
  const h = healthOf({ rows: [], todayRow: null, today: T, pTarget: 100 });
  assert.equal(h.pct, 50); assert.equal(h.stage, "vua"); assert.equal(h.next.key, "meal");
  assert.match(healthLine(h), /bữa đầu/);
});

test("ngày đủ bữa + đủ đạm cộng 25; bỏ 2 ngày trừ 40 → mệt", () => {
  const rows = [day(addDays(T, -3), 3, 40), empty(addDays(T, -2)), empty(addDays(T, -1))];
  const h = healthOf({ rows, today: T, pTarget: 100 });
  assert.equal(h.pct, 35);
  const rows2 = [day(addDays(T, -3), 1), empty(addDays(T, -2)), empty(addDays(T, -1))]; // 50+0−40 = 10
  const h2 = healthOf({ rows: rows2, today: T, pTarget: 100 });
  assert.equal(h2.pct, 10); assert.equal(h2.stage, "met");
  assert.match(healthLine(h2), /buồn ngủ/);
});

test("ngày trước khi bắt đầu dùng app không bị trừ", () => {
  const h = healthOf({ rows: [day(addDays(T, -1), 3, 40)], today: T, pTarget: 100 });
  assert.equal(h.pct, 75);
});

test("chăm đều → 100%, khoẻ, đếm ngày liền; giữ trong 0–100", () => {
  const rows = Array.from({ length: 10 }, (_, i) => day(addDays(T, -10 + i), 3, 40));
  const h = healthOf({ rows, todayRow: day(T, 3, 40), today: T, pTarget: 100 });
  assert.equal(h.pct, 100); assert.equal(h.stage, "khoe");
  assert.ok(h.streak >= 9, `streak ${h.streak}`);
  assert.match(healthLine(h), /khoẻ rực/);
});

test("hôm nay: chỉ cộng, gợi ý bước kế (đủ bữa → đạm → tập)", () => {
  const gymOf = (d) => (d === T ? { planned: true, done: false } : {});
  let h = healthOf({ rows: [], todayRow: day(T, 1), today: T, pTarget: 100, gymOf });
  assert.equal(h.next.key, "full"); assert.equal(h.next.pct, 65);
  h = healthOf({ rows: [], todayRow: day(T, 3, 10), today: T, pTarget: 100, gymOf });
  assert.equal(h.pct, 65); assert.equal(h.next.key, "protein");
  h = healthOf({ rows: [], todayRow: day(T, 3, 40), today: T, pTarget: 100, gymOf });
  assert.equal(h.pct, 75); assert.equal(h.next.key, "gym");
  h = healthOf({ rows: [], todayRow: day(T, 3, 40), today: T, pTarget: 100, gymOf: () => ({ planned: true, done: true }) });
  assert.equal(h.pct, 80); assert.equal(h.next, null); assert.equal(h.stage, "khoe");
});

test("bữa dưới 100 kcal không tính; bữa chưa tick không tính", () => {
  const r = { log_date: T, meals: [meal("sang", 50, 5), meal("trua", 500, 30), meal("toi", 500, 30)], eaten_meals: ["sang", "trua"] };
  assert.equal(dayDone(r, { pTarget: 60 }).meals, 1);
  assert.equal(HEALTH.miss, -20);
});

test("đã 100%: câu nói giữ khoẻ, không 'lên 100%'", () => {
  const rows = Array.from({ length: 10 }, (_, i) => day(addDays(T, -10 + i), 3, 40));
  let h = healthOf({ rows, todayRow: null, today: T, pTarget: 100 });
  assert.equal(h.pct, 100); assert.match(healthLine(h), /giữ Pi khoẻ/);
  h = healthOf({ rows, todayRow: day(T, 1), today: T, pTarget: 100 });
  assert.equal(healthLine(h), "Ghi đủ 3 bữa hôm nay để giữ Pi khoẻ rực");
});
