// node --test tests/ — calcMacro: sàn calo an toàn khi giảm mỡ
import test from "node:test";
import assert from "node:assert/strict";
import { calcMacro } from "../src/calcMacro.js";

const small = { cm: 150, kg: 45, birthYear: 1995, goalKg: 42, goalType: "cut", months: 3, gender: "female", exerciseType: "none" };

test("giảm mỡ: nữ không dưới 1.200 kcal, nam không dưới 1.500 kcal (cả ngày nghỉ)", () => {
  const f = calcMacro(small);
  assert.ok(f.calTarget >= 1200 && f.calRest >= 1200);
  assert.equal(f.floorApplied, true);
  const f2 = calcMacro({ ...small, cm: 155, kg: 50, exerciseType: "gym", frequency: "occasional", calorieMode: "asian" });
  assert.ok(f2.calRest >= 1200, `ngày nghỉ ${f2.calRest}`);
  const m = calcMacro({ ...small, cm: 165, kg: 60, gender: "male", calorieMode: "asian" });
  assert.ok(m.calTarget >= 1500);
});

test("keto vẫn giữ tinh bột thấp khi bù sàn calo (bù bằng chất béo)", () => {
  const k = calcMacro({ ...small, cm: 165, kg: 60, gender: "male", calorieMode: "asian", dietStrategy: "keto" });
  assert.ok(k.carb <= 50);
  assert.ok(k.calTarget >= 1500);
});

test("người to không bị ảnh hưởng", () => {
  const b = calcMacro({ cm: 175, kg: 80, birthYear: 1990, goalKg: 72, goalType: "cut", months: 4, gender: "male", exerciseType: "gym" });
  assert.equal(b.floorApplied, false);
  assert.ok(b.calTarget > 2000);
});

// 17/10: trung bình cả tuần (ngày tập + ngày nghỉ) đúng bằng mục tiêu calo
test("trung bình tuần = mục tiêu (TDEE ± điều chỉnh), theo số ngày tập", () => {
  for (const [goal, gk] of [["bulk", 68], ["cut", 60], ["maintain", 65]]) {
    for (const days of [[0, 2, 4], [0, 1, 2, 3], [0, 1, 2, 3, 4, 5]]) {
      const m = calcMacro({ cm: 172, kg: 65, birthYear: 1990, goalKg: gk, goalType: goal, months: 4, gender: "male", exerciseType: "gym", frequency: "regular", gymDays: days });
      const n = days.length;
      const avg = (m.calTarget * n + m.calRest * (7 - n)) / 7;
      assert.ok(Math.abs(avg - m.calTargetRaw) <= 12, `${goal} ${n} ngày: TB ${avg.toFixed(0)} vs mục tiêu ${m.calTargetRaw}`);
      assert.ok(m.calTarget > m.calRest, "ngày tập nhiều hơn ngày nghỉ");
    }
  }
});

test("BMI > 27: đạm / béo theo cân ở BMI 27, giảm mỡ thì tổng calo dưới TDEE", () => {
  const m = calcMacro({ cm: 175, kg: 120, birthYear: 1990, goalKg: 95, goalType: "cut", months: 6, gender: "male", exerciseType: "gym", frequency: "occasional", gymDays: [0, 2, 4] });
  assert.equal(m.refKg, 82.7);
  assert.equal(m.protein, Math.round(82.7 * 2.2));
  const avg = (m.calTarget * 3 + m.calRest * 4) / 7;
  assert.ok(avg < m.tdee - 300, `TB ${avg} phải thấp hơn TDEE ${m.tdee}`);
  const n = calcMacro({ cm: 172, kg: 65, birthYear: 1990, goalKg: 68, goalType: "bulk", months: 4, gender: "male", exerciseType: "gym" });
  assert.equal(n.refKg, 65); // người bình thường không đổi
  assert.equal(n.protein, 130);
});

test("không tập / keto: 1 bộ số (không chia ngày tập / nghỉ)", () => {
  const a = calcMacro({ cm: 160, kg: 55, birthYear: 1995, goalKg: 52, goalType: "cut", months: 3, gender: "female", exerciseType: "none" });
  assert.equal(a.calTarget, a.calRest);
  const k = calcMacro({ cm: 170, kg: 70, birthYear: 1995, goalKg: 65, goalType: "cut", months: 3, gender: "male", exerciseType: "gym", dietStrategy: "keto", gymDays: [0, 2, 4] });
  assert.equal(k.carb, k.carbRest);
});
