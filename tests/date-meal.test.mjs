// node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import * as D from "../src/lib/dateVN.js";
import * as M from "../src/lib/mealMath.js";

test("toVNDate: trước 7h sáng VN không bị lùi về hôm qua", () => {
  // 2026-10-13 05:30 giờ VN = 2026-10-12 22:30 UTC
  assert.equal(D.toVNDate(new Date("2026-10-12T22:30:00Z")), "2026-10-13");
  // 2026-10-13 23:59 VN = 16:59 UTC
  assert.equal(D.toVNDate(new Date("2026-10-13T16:59:00Z")), "2026-10-13");
  assert.equal(D.toVNDate(new Date("2026-10-13T17:00:00Z")), "2026-10-14");
});

test("addDays / diff / weekday", () => {
  assert.equal(D.addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(D.addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(D.addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(D.diffDays("2026-10-01", "2026-10-13"), 12);
  assert.equal(D.weekdayOf("2026-10-13"), 2); // Thứ 3
  assert.equal(D.weekdayShort("2026-10-18"), "CN");
  assert.equal(D.templateKeyOf("2026-10-12"), "thu_2");
  assert.equal(D.gymIdxOf("2026-10-12"), 0); // T2 → 0
  assert.equal(D.gymIdxOf("2026-10-18"), 6); // CN → 6
  assert.equal(D.isGymDate([0, 2, 4, 5], "2026-10-14"), true); // T4
  assert.equal(D.isGymDate([0, 2, 4, 5], "2026-10-13"), false); // T3
});

test("weekRange / monthRange", () => {
  assert.deepEqual(D.weekRange("2026-10-13"), { start: "2026-10-12", end: "2026-10-18" });
  assert.deepEqual(D.weekRange("2026-10-18"), { start: "2026-10-12", end: "2026-10-18" });
  assert.deepEqual(D.monthRange("2026-02-10"), { start: "2026-02-01", end: "2026-02-28" });
  assert.deepEqual(D.lastNDays(7, "2026-10-13"), { start: "2026-10-07", end: "2026-10-13" });
  assert.equal(D.dateList("2026-10-30", "2026-11-02").length, 4);
  assert.equal(D.isValidDateStr("2026-02-30"), false);
  assert.equal(D.friendlyDate("2026-10-12", "2026-10-13"), "Hôm qua");
});

test("sumItems chấp nhận p/protein, chuỗi số, rác", () => {
  const t = M.sumItems([{ cal: 100, p: 10 }, { cal: "50", protein: 5, carb: 3 }, { cal: "abc" }, null]);
  assert.deepEqual(t, { cal: 150, p: 15, c: 3, f: 0, fiber: 0 });
});

test("setMeal gộp theo meal_id, không đè bữa khác", () => {
  let day = { meals: [], eaten_meals: [] };
  day = M.setMeal(day, "trua", [{ cal: 500 }]);
  day = M.setMeal(day, "sang", [{ cal: 300 }]);
  day = M.setMeal(day, "trua", [{ cal: 600 }]);
  assert.deepEqual(day.meals.map(M.mealKey), ["sang", "trua"]);
  assert.equal(M.sumMeals(day.meals).cal, 900);
});

test("setMeal markEaten + giữ tick khi sửa + xoá thì bỏ tick", () => {
  let day = M.setMeal({}, "toi", [{ cal: 400 }], { markEaten: true });
  assert.deepEqual(day.eaten_meals, ["toi"]);
  day = M.setMeal(day, "toi", [{ cal: 450 }]);
  assert.deepEqual(day.eaten_meals, ["toi"]);
  day = M.setMeal(day, "toi", []);
  assert.deepEqual(day.eaten_meals, []);
  assert.equal(day.meals.length, 0);
});

test("eatenTotals chỉ tính bữa đã ăn", () => {
  const day = { meals: [{ meal_id: "sang", items: [{ cal: 300 }] }, { meal_id: "trua", items: [{ cal: 700 }] }], eaten_meals: ["sang"] };
  assert.equal(M.eatenTotals(day.meals, day.eaten_meals).cal, 300);
  assert.equal(M.eatenTotals(day.meals, []).cal, 0);
});

test("toggleEatenIn không tick bữa trống, không trùng", () => {
  const day = { meals: [{ meal_id: "sang", items: [{ cal: 1 }] }], eaten_meals: [] };
  let d = M.toggleEatenIn(day, "sang", true);
  d = M.toggleEatenIn(d, "sang", true);
  assert.deepEqual(d.eaten_meals, ["sang"]);
  assert.deepEqual(M.toggleEatenIn(d, "trua", true).eaten_meals, ["sang"]);
  assert.deepEqual(M.toggleEatenIn(d, "sang", false).eaten_meals, []);
});

test("applyMenu giữ bữa đã ăn, thay bữa còn lại", () => {
  const day = {
    day_type: "train",
    meals: [{ meal_id: "sang", items: [{ cal: 300 }] }, { meal_id: "trua", items: [{ cal: 700 }] }],
    eaten_meals: ["sang"],
  };
  const out = M.applyMenu(day, [
    { meal_id: "sang", items: [{ cal: 999 }] },
    { meal_id: "trua", items: [{ cal: 500 }] },
    { meal_id: "toi", items: [{ cal: 600 }] },
    { meal_id: "pre", items: [] },
  ], "rest");
  assert.equal(out.day_type, "rest");
  assert.deepEqual(out.meals.map(M.mealKey), ["sang", "trua", "toi"]);
  assert.equal(M.sumMeals(out.meals).cal, 300 + 500 + 600);
  assert.deepEqual(out.eaten_meals, ["sang"]);
});

test("dayRowPayload làm tròn + is_complete theo bữa đã ăn", () => {
  const p = M.dayRowPayload("u", "2026-10-13", { day_type: "x", meals: [{ meal_id: "sang", items: [{ cal: 100.6, p: 1.25 }] }], eaten_meals: [] });
  assert.equal(p.total_cal, 101);
  assert.equal(p.total_protein, 1.3);
  assert.equal(p.day_type, "train");
  assert.equal(p.is_complete, false);
});

test("toSlots điền món theo khung", () => {
  const slots = M.toSlots({ meals: [{ meal_id: "trua", items: [{ cal: 1 }], pattern: "Cơm" }] }, [{ id: "sang", name: "S" }, { id: "trua", name: "T" }]);
  assert.equal(slots[0].items.length, 0);
  assert.equal(slots[1].pattern, "Cơm");
});

import * as W from "../src/lib/weightMath.js";
test("normalizeWeights sắp theo ngày, đánh lại tuần + delta", () => {
  const rows = [
    { id: "b", kg: "65", logged_date: "2026-10-08", week: 5, delta: 9 },
    { id: "a", kg: 64.4, logged_date: "2026-10-01", week: 1, delta: null },
    { id: "c", kg: 65, logged_date: "2026-10-13", week: 2, delta: null },
  ];
  const out = W.normalizeWeights(rows);
  assert.deepEqual(out.map(r => [r.id, r.week, r.delta]), [["a", 1, null], ["b", 2, 0.6], ["c", 3, null]]);
  assert.deepEqual(W.weightRowsToFix(rows, out).map(r => r.id).sort(), ["b", "c"]);
});
test("parseKg", () => {
  assert.equal(W.parseKg("64,35"), 64.4);
  assert.equal(W.parseKg("abc"), null);
  assert.equal(W.parseKg("12"), null);
});
