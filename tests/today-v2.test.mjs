import test from "node:test";
import assert from "node:assert/strict";
import { cupsView } from "../src/lib/dayPlan.js";
import { weekCard } from "../src/lib/mobileView.js";

test("cupsView: 2.750 ml / cốc 250 = 11 cốc, 5 cốc đã uống", () => {
  const v = cupsView(1250, 2750, 250);
  assert.equal(v.need, 11); assert.equal(v.total, 11); assert.equal(v.filled, 5); assert.equal(v.left, 6);
  assert.equal(v.cups.filter((c) => c.full).length, 5);
});
test("cupsView: lẻ ml làm tròn xuống số cốc, cỡ cốc lạ về 250", () => {
  const v = cupsView(300, 2000, 123);
  assert.equal(v.cupMl, 250); assert.equal(v.filled, 1); assert.equal(v.need, 8);
});
test("cupsView: uống vượt mục tiêu vẫn còn 1 cốc trống để bấm", () => {
  const v = cupsView(3000, 2000, 500);
  assert.equal(v.filled, 6); assert.equal(v.total, 7); assert.equal(v.done, true); assert.equal(v.left, 0);
});
test("weekCard: đếm ngày đạt ±10%, bỏ ngày tương lai, hôm nay lấy todayLog", () => {
  const m = (cal) => ({ meal_id: "trua", items: [{ name: "x", cal, p: 0, c: 0, f: 0 }] });
  const rows = [
    { log_date: "2026-10-12", meals: [m(2000)], eaten_meals: ["trua"] },
    { log_date: "2026-10-13", meals: [m(5)], eaten_meals: ["trua"] },
  ];
  const todayLog = { log_date: "2026-10-13", meals: [m(500)], eaten_meals: ["trua"] };
  const dates = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"];
  const w = weekCard(rows, todayLog, dates, "2026-10-13", () => 2100);
  assert.equal(w.days[1].cal, 500);
  assert.equal(w.days[2].kind, "future");
  assert.equal(w.countedDays, 2); assert.equal(w.okDays, 1); assert.equal(w.avg, 1250);
});

import { weightChart } from "../src/lib/mobileView.js";
test("weightChart: lọc 4 tuần, toạ độ 0..1, có vạch mục tiêu, eta đúng hướng", () => {
  const log = [{ logged_date: "2026-08-01", kg: 63 }, { logged_date: "2026-09-20", kg: 64 }, { logged_date: "2026-10-10", kg: 64.6 }];
  const c = weightChart(log, 66, "4w", "2026-10-14", 0.2, 64.6);
  assert.equal(c.points.length, 2);
  assert.ok(c.points.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1));
  assert.ok(c.goalY >= 0 && c.goalY < c.points[1].y);
  assert.equal(c.eta, 7);
  assert.equal(weightChart(log, 66, "all", "2026-10-14", -0.2, 64.6).eta, null);
  assert.equal(weightChart([], 66, "all", "2026-10-14").points.length, 0);
});
