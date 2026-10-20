import test from "node:test";
import assert from "node:assert/strict";
import { monthRecap, prevMonth, longestStreak, monthWeights, recapCardMonth, headline } from "../src/lib/monthRecap.js";

const meal = (id, cal) => ({ meal_id: id, items: [{ food: "x", gram: 100, cal, p: 0, c: 0, f: 0 }] });
const day = (d, cal, eaten = true) => ({ log_date: d, meals: [meal("sang", cal)], eaten_meals: eaten ? ["sang"] : [] });

test("prevMonth / recapCardMonth", () => {
  assert.equal(prevMonth("2026-01"), "2025-12");
  assert.equal(prevMonth("2026-11"), "2026-10");
  assert.equal(recapCardMonth("2026-11-03"), "2026-10");
  assert.equal(recapCardMonth("2026-11-08"), null);
});
test("longestStreak", () => {
  assert.equal(longestStreak([{ eatenCount: 1 }, { eatenCount: 1 }, { eatenCount: 0 }, { eatenCount: 1 }]), 2);
});
test("monthWeights lấy lần cân trước ngày 1 làm mốc đầu", () => {
  const w = monthWeights([{ logged_date: "2026-09-28", kg: 84.2 }, { logged_date: "2026-10-13", kg: 83.3 }, { logged_date: "2026-10-31", kg: 81.8 }, { logged_date: "2026-11-02", kg: 81 }], "2026-10", "2026-11-03");
  assert.equal(w.startKg, 84.2); assert.equal(w.endKg, 81.8); assert.equal(w.delta, -2.4); assert.equal(w.count, 2);
});
test("monthRecap tháng 10 giảm cân", () => {
  const rows = []; for (let i = 1; i <= 24; i++) rows.push(day(`2026-10-${String(i).padStart(2, "0")}`, 1600));
  const prevRows = []; for (let i = 1; i <= 17; i++) prevRows.push(day(`2026-09-${String(i).padStart(2, "0")}`, 1900));
  const r = monthRecap({ m: "2026-10", today: "2026-11-02", rows, prevRows, weightLog: [{ logged_date: "2026-09-01", kg: 85.8 }, { logged_date: "2026-09-30", kg: 84.2 }, { logged_date: "2026-10-15", kg: 83 }, { logged_date: "2026-10-31", kg: 81.8 }], goalKg: 75, goalType: "cut", targetOf: () => 1650, target: 1650 });
  assert.equal(r.loggedDays, 24); assert.equal(r.okDays, 24); assert.equal(r.streak, 24); assert.equal(r.delta, -2.4);
  assert.equal(r.days, 31); assert.equal(r.ongoing, false); assert.equal(r.thin, false);
  assert.equal(r.say.head, "Giảm đều và an toàn.");
  assert.equal(r.cmp[0].better, true); // giảm nhiều hơn tháng 9 (−1,6)
  assert.equal(r.cmp.find((c) => c.l === "Ngày đã ăn").better, true);
  assert.equal(headline(r), "Bạn đã giảm 2,4 kg");
  assert.equal(r.kgLeft, 6.8); assert.equal(r.pct, 37);
});
test("monthRecap ít dữ liệu → thin", () => {
  const r = monthRecap({ m: "2026-10", today: "2026-10-20", rows: [day("2026-10-02", 1500)], weightLog: [{ logged_date: "2026-10-02", kg: 70 }], goalKg: 65, goalType: "cut", targetOf: () => 1600, target: 1600 });
  assert.equal(r.thin, true); assert.equal(r.ongoing, true); assert.equal(r.daysPassed, 20); assert.equal(r.delta, null);
  assert.equal(r.tip.t, "Ăn đều bữa hơn");
});
test("tăng cơ: chữ tăng", () => {
  const rows = []; for (let i = 1; i <= 20; i++) rows.push(day(`2026-10-${String(i).padStart(2, "0")}`, 2500));
  const r = monthRecap({ m: "2026-10", today: "2026-11-01", rows, weightLog: [{ logged_date: "2026-10-01", kg: 65 }, { logged_date: "2026-10-31", kg: 65.8 }], goalKg: 70, goalType: "bulk", targetOf: () => 2600, target: 2600 });
  assert.equal(headline(r), "Bạn đã tăng 0,8 kg"); assert.equal(r.say.head, "Tăng đều.");
});
