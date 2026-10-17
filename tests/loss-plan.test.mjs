// node --test tests/ — flow giảm cân (bản vẽ 131)
import test from "node:test";
import assert from "node:assert/strict";
import { lossChoices, goalError, goalVerdict, lossStatus, streakDays, milestones } from "../src/lib/lossPlan.js";

test("chip giảm bao nhiêu: chỉ mức còn ≥ BMI 20, gợi ý về gần BMI 23, chặng đầu ≤ ~12%", () => {
  const a = lossChoices(85, 170);
  assert.deepEqual(a.options, [5, 8, 10]);
  assert.equal(a.pick, 10);
  const b = lossChoices(61, 160); // ảnh chủ dự án 18/10: trước đây cho −10 kg "hợp lý"
  assert.deepEqual(b.options, [2, 3, 5]);
  assert.equal(b.pick, 2);
  assert.equal(b.options.includes(10), false);
  const c = lossChoices(55, 160);
  assert.equal(c.normal, true);
  assert.deepEqual(c.options, [2, 3]);
  const d = lossChoices(48, 165);
  assert.equal(d.options.length, 0);
  assert.equal(d.pick, "x");
});

test("cân đích tự nhập + nhận xét", () => {
  assert.match(goalError(85, 90, 170), /nhỏ hơn/);
  assert.match(goalError(85, 40, 170), /Thấp quá/);
  assert.equal(goalError(85, 75, 170), null);
  assert.equal(goalVerdict(61, 51, 160).tone, "warn"); // BMI 19,9
  assert.match(goalVerdict(61, 51, 160).text, /52–58 kg/);
  assert.equal(goalVerdict(61, 56, 160).tone, "ok");
  assert.equal(goalVerdict(100, 80, 175).tone, "warn"); // −20% một lúc
  assert.equal(goalVerdict(85, 75, 170).tone, "ok");
});

test("dòng trạng thái Hôm nay", () => {
  const rows = [{ id: "sang", name: "Bữa sáng", state: "eaten", minutes: 420 }, { id: "toi", name: "Bữa tối", state: "planned", minutes: 1170, items: [{ food: "Bún cá" }] }];
  assert.equal(lossStatus({ target: 1650, eaten: 900, rows, nowMinutes: 1100 }).title, "Đang đúng kế hoạch 👍");
  assert.match(lossStatus({ target: 1650, eaten: 900, rows, nowMinutes: 1100 }).sub, /Bún cá/);
  assert.equal(lossStatus({ target: 1650, eaten: 1700, rows, nowMinutes: 1100 }).tone, "warn");
  assert.equal(lossStatus({ target: 1650, eaten: 2000, rows, nowMinutes: 1100 }).tone, "over");
  assert.match(lossStatus({ target: 1650, eaten: 1500, rows: rows.map((r) => ({ ...r, state: "eaten" })), nowMinutes: 1300 }).title, /đạt/);
});

test("chuỗi ngày + mốc", () => {
  const rows = ["2026-10-15", "2026-10-16", "2026-10-17"].map((d) => ({ log_date: d, eaten_meals: ["sang"] }));
  assert.equal(streakDays(rows, "2026-10-18"), 3);
  assert.equal(streakDays(rows, "2026-10-17"), 3);
  assert.equal(streakDays(rows, "2026-10-20"), 0);
  const m = milestones({ startKg: 85, curKg: 82.6, goalKg: 75 });
  assert.equal(m[0].done, true);
  assert.equal(m[1].done, false);
  assert.equal(m.length, 4);
});
