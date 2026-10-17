// node --test tests/ — flow giảm cân (bản vẽ 131)
import test from "node:test";
import assert from "node:assert/strict";
import { lossChoices, goalError, lossStatus, streakDays, milestones } from "../src/lib/lossPlan.js";

test("chip giảm bao nhiêu: lọc theo BMI 18,5, gợi ý gần BMI 23", () => {
  const a = lossChoices(85, 170); // BMI 23 = 66,5 → cần 18,5 → gợi ý 10
  assert.deepEqual(a.options, [5, 8, 10]);
  assert.equal(a.pick, 10);
  const b = lossChoices(55, 160); // BMI 18,5 = 47,4 → chỉ 5 (50) hợp lệ
  assert.deepEqual(b.options, [5]);
  assert.equal(lossChoices(48, 165).options.length, 0);
});

test("cân đích tự nhập", () => {
  assert.match(goalError(85, 90, 170), /nhỏ hơn/);
  assert.match(goalError(85, 40, 170), /Thấp quá/);
  assert.equal(goalError(85, 75, 170), null);
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
