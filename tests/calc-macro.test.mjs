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
