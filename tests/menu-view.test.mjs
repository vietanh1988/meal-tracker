// node --test tests/ — tab Thực đơn
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/lib/menuView.js";

const macro = { calTarget: 2400, calRest: 2100, protein: 130, carb: 300, carbRest: 225, fat: 70 };
const it = (cal) => ({ food: "x", gram: 100, cal });

test("dailyTargetOf", () => {
  assert.deepEqual(M.dailyTargetOf(macro, "train"), { cal: 2400, p: 130, c: 300, f: 70 });
  assert.deepEqual(M.dailyTargetOf(macro, "rest"), { cal: 2100, p: 130, c: 225, f: 70 });
});

test("weekRows: loại ngày theo gymDays, hôm nay, thiếu nhiều, sắp bữa", () => {
  const tpls = {
    thu_3: { day_type: "train", total_cal: 1000, meals: [{ meal_id: "toi", meal_name: "toi", items: [it(500)] }, { meal_id: "sang", meal_name: "🍳 Bữa sáng", items: [it(500)] }] },
    cn: { day_type: "rest", meals: [{ meal_id: "trua", items: [] }] },
  };
  const rows = M.weekRows({ getTemplate: (k) => tpls[k], gymDays: [1, 3], exerciseType: "gym", macro, today: "2026-10-13" }); // 13/10 là T3
  assert.equal(rows.length, 7);
  assert.equal(rows[1].isToday, true);
  assert.equal(rows[1].dayType, "train");
  assert.equal(rows[0].dayType, "rest");
  assert.deepEqual(rows[1].names, ["Bữa sáng", "Bữa tối"]);
  assert.equal(rows[1].cal, 1000);
  assert.equal(rows[1].low, true); // 1000 < 70% của 2400
  assert.equal(rows[6].tpl, null); // CN chỉ có bữa rỗng
  const none = M.weekRows({ getTemplate: () => null, gymDays: [1], exerciseType: "none", macro, today: "2026-10-13" });
  assert.ok(none.every((r) => r.dayType === "rest"));
});

test("weekRows: mẫu lưu khác loại ngày hiện tại → mismatch", () => {
  const rows = M.weekRows({ getTemplate: (k) => (k === "thu_2" ? { day_type: "train", meals: [{ meal_id: "sang", items: [it(300)] }] } : null), gymDays: [], macro });
  assert.equal(rows[0].mismatch, true);
});

test("libraryFor / bundlesFor", () => {
  const T = [
    { id: 1, goal_type: "tang_co", day_type: "train" },
    { id: 2, goal_type: "tang_co", day_type: "rest" },
    { id: 3, goal_type: "giam_mo", day_type: "train", diet_strategy: "keto" },
    { id: 4, goal_type: "giam_mo", day_type: "train" },
  ];
  assert.deepEqual(M.libraryFor(T, { goal: "bulk", dayType: "train" }).map((t) => t.id), [1]);
  assert.deepEqual(M.libraryFor(T, { goal: "cut", dietStrategy: "keto", dayType: "train" }).map((t) => t.id), [3]);
  assert.deepEqual(M.libraryFor(T, { goal: "cut", dietStrategy: "balanced", dayType: "train" }).map((t) => t.id), [4]);
  assert.deepEqual(M.bundlesFor([{ id: "a", goal_type: "duy_tri" }, { id: "b", goal_type: "tang_co" }], "maintain").map((b) => b.id), ["a"]);
});

test("dayToTemplateMeals: bỏ bữa rỗng, tên có dấu", () => {
  const out = M.dayToTemplateMeals({ meals: [{ meal_id: "trua", meal_name: "trua", items: [it(400)] }, { meal_id: "toi", items: [] }] });
  assert.deepEqual(out, [{ meal_id: "trua", meal_name: "Bữa trưa", items: [it(400)] }]);
});
