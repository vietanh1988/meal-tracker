// node --test tests/ — thẻ Kiểm tra tuần (bản vẽ 127a–d)
import test from "node:test";
import assert from "node:assert/strict";
import { weeklyCheck, checkinDue, nextOffset } from "../src/lib/weeklyCheck.js";
import { addDays } from "../src/lib/dateVN.js";

const today = "2026-10-19"; // thứ Hai
const W = (pairs) => pairs.map(([d, kg]) => ({ logged_date: addDays(today, -d), kg }));
const days = (n) => Array.from({ length: n }, (_, i) => ({ log_date: addDays(today, -(i + 1)), eaten_meals: ["sang"] }));
const base = { today, goal: "cut", kgWeek: 0.4, curKg: 85, dayRows: days(7) };

test("chỉ giảm mỡ + tăng cơ, 1 lần / tuần, lần đầu sau 7 ngày", () => {
  assert.equal(checkinDue({ today, goal: "maintain", firstDate: "2026-01-01" }), false);
  assert.equal(checkinDue({ today, goal: "cut", firstDate: addDays(today, -3) }), false);
  assert.equal(checkinDue({ today, goal: "cut", firstDate: addDays(today, -7) }), true);
  assert.equal(checkinDue({ today, goal: "cut", checkinDate: today, firstDate: "2026-01-01" }), false);
  assert.equal(checkinDue({ today, goal: "cut", checkinDate: addDays(today, -7) }), true);
  assert.equal(checkinDue({ today, goal: "cut", checkinDate: addDays(today, -1) }), false, "xử lý CN → không hiện ngay T2");
  assert.equal(checkinDue({ today: addDays(today, 4), goal: "cut", checkinDate: addDays(today, -1) }), true);
});

test("127d: thiếu lần cân hoặc ghi bữa < 4/7 ngày", () => {
  assert.equal(weeklyCheck({ ...base, weightLog: W([[10, 85.2]]) }).kind, "nodata");
  assert.equal(weeklyCheck({ ...base, weightLog: W([[3, 85.2], [0, 85]]) }).kind, "nodata", "2 lần cân cách < 7 ngày");
  const r = weeklyCheck({ ...base, dayRows: days(2), weightLog: W([[13, 85.2], [0, 85]]) });
  assert.equal(r.kind, "nodata");
  assert.equal(r.mealDays, 2);
});

test("127a: cân đứng → bớt 100 kcal (trừ khi đã ở sàn)", () => {
  const r = weeklyCheck({ ...base, weightLog: W([[13, 85.2], [7, 85.1], [0, 85.0]]) });
  assert.equal(r.kind, "slow");
  assert.equal(r.delta, -100);
  assert.ok(r.loss < 0.2);
  assert.equal(weeklyCheck({ ...base, atFloor: true, weightLog: W([[13, 85.2], [0, 85.0]]) }).delta, 0);
  assert.equal(weeklyCheck({ ...base, calOffset: -300, weightLog: W([[13, 85.2], [0, 85.0]]) }).delta, 0);
});

test("127b: cân đứng nhưng eo nhỏ đi ≥ 1 cm → trấn an", () => {
  const measures = [{ log_date: addDays(today, -12), waist: 92 }, { log_date: addDays(today, -1), waist: 90.5 }];
  const r = weeklyCheck({ ...base, measures, weightLog: W([[13, 85.2], [0, 85.1]]) });
  assert.equal(r.kind, "waist");
  assert.equal(r.waistTo - r.waistFrom, -1.5);
});

test("127c: giảm quá nhanh → thêm 100 kcal; đúng tốc độ → không hiện", () => {
  const r = weeklyCheck({ ...base, weightLog: W([[14, 86.6], [7, 85.4], [0, 84.2]]) });
  assert.equal(r.kind, "fast");
  assert.equal(r.delta, 100);
  assert.equal(weeklyCheck({ ...base, weightLog: W([[13, 85.8], [6, 85.4], [0, 85.0]]) }), null);
});

test("nextOffset kẹp trong −300…+300", () => {
  assert.equal(nextOffset(-250, -100), -300);
  assert.equal(nextOffset(0, 100), 100);
});

test("129a–b tăng cơ: chưa tăng → +100; tăng nhanh hoặc eo to → −100; đúng tốc độ → không hiện", () => {
  const b = { ...base, goal: "bulk", kgWeek: 0.23, curKg: 65 };
  const slow = weeklyCheck({ ...b, weightLog: W([[13, 65.0], [0, 65.1]]) });
  assert.equal(slow.kind, "bulk_slow");
  assert.equal(slow.delta, 100);
  assert.equal(weeklyCheck({ ...b, calOffset: 300, weightLog: W([[13, 65.0], [0, 65.1]]) }).delta, 0);
  const fast = weeklyCheck({ ...b, weightLog: W([[13, 65.0], [0, 66.4]]) });
  assert.equal(fast.kind, "bulk_fast");
  assert.equal(fast.delta, -100);
  const measures = [{ log_date: addDays(today, -12), waist: 78 }, { log_date: addDays(today, -1), waist: 79.5 }];
  assert.equal(weeklyCheck({ ...b, measures, weightLog: W([[13, 65.0], [0, 65.4]]) }).kind, "bulk_fast", "eo to thêm ≥ 1 cm");
  assert.equal(weeklyCheck({ ...b, weightLog: W([[13, 65.0], [0, 65.45]]) }), null);
  assert.equal(weeklyCheck({ ...b, calOffset: -250, weightLog: W([[13, 65.0], [0, 66.4]]) }).delta, 0, "không bớt dưới TDEE");
  assert.equal(nextOffset(-200, -100, "bulk"), -250);
});
