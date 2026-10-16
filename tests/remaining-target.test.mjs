import test from "node:test";
import assert from "node:assert/strict";
import { remainingTarget } from "../src/lib/mealMath.js";

test("còn lại = cả ngày − đã ăn", () => {
  const r = remainingTarget({ cal: 2000, p: 150, c: 200, f: 60 }, { cal: 600, p: 45, c: 60, f: 18 });
  assert.equal(r.cal, 1400);
  assert.equal(r.p, 105);
  assert.equal(r.f, 42);
  assert.ok(Math.abs(r.p * 4 + r.c * 4 + r.f * 9 - r.cal) <= 6);
});
test("đạm đã ăn vượt → vẫn giữ tối thiểu 15% kcal từ đạm", () => {
  const r = remainingTarget({ cal: 2000, p: 150, c: 200, f: 60 }, { cal: 1000, p: 160, c: 40, f: 30 });
  assert.equal(r.cal, 1000);
  assert.ok(r.p >= 37);
  assert.ok(r.c > 0);
});
test("đã ăn đủ / vượt → 0", () => {
  assert.deepEqual(remainingTarget({ cal: 1800, p: 120, c: 180, f: 60 }, { cal: 1900 }), { cal: 0, p: 0, c: 0, f: 0 });
});
