// node --test tests/ — Vận động thêm (bản vẽ 130a–c)
import test from "node:test";
import assert from "node:assert/strict";
import { actKcal, dayBurn, activityBonus, withBonus, stepsToMin, bonusTip, actSummary } from "../src/lib/activity.js";

test("kcal = MET × kg × giờ × 0,8, làm tròn 10", () => {
  assert.equal(actKcal("walk", 45, 65), 140); // 3,5 × 65 × 0,75 × 0,8 = 136,5
  assert.equal(actKcal("run", 30, 70), 220);
  assert.equal(stepsToMin(6000), 60);
  assert.equal(actKcal("walk", 0, 65), 0);
});

test("cộng dồn trong ngày, tối đa 400", () => {
  assert.equal(dayBurn([{ kcal: 150 }, { kcal: 300 }]), 400);
  assert.equal(dayBurn([]), 0);
});

test("phần cộng vào mục tiêu: tăng cơ hết · duy trì ½ · giảm mỡ 0 (> 300 mới ½)", () => {
  assert.equal(activityBonus(150, "bulk"), 150);
  assert.equal(activityBonus(150, "maintain"), 80);
  assert.equal(activityBonus(150, "cut"), 0);
  assert.equal(activityBonus(360, "cut"), 180);
});

test("withBonus cộng calo + tinh bột cả ngày tập lẫn nghỉ", () => {
  const m = withBonus({ calTarget: 2750, calRest: 2400, carb: 380, carbRest: 290, protein: 130 }, 160);
  assert.equal(m.calTarget, 2910);
  assert.equal(m.calRest, 2560);
  assert.equal(m.carb, 420);
  assert.equal(m.protein, 130);
  const o = { calTarget: 1 };
  assert.equal(withBonus(o, 0), o);
});

test("gợi ý ăn bù + tóm tắt", () => {
  assert.match(bonusTip(100), /trứng|sữa chua/);
  assert.match(bonusTip(200), /chén cơm/);
  assert.equal(actSummary([{ type: "walk", min: 45 }, { type: "run", min: 20 }]), "Đi bộ 45 phút + Chạy 20 phút");
});
