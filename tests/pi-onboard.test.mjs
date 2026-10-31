import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onboardView, justFinishedFirst, ONBOARD_TOTAL } from "../src/pi/onboard.js";

test("làm quen: chưa làm gì → việc 1, +30", () => {
  const v = onboardView({ n: 0, last: null, day: "2026-10-31" });
  assert.equal(v.kind, "task"); assert.equal(v.n, 1); assert.equal(v.task.pts, 30); assert.equal(v.task.act, "log");
});
test("làm quen: xong việc 1 hôm nay → thu gọn, mai làm tiếp", () => {
  assert.deepEqual(onboardView({ n: 1, last: "2026-10-31", day: "2026-10-31" }), { kind: "done", n: 1, pts: 30 });
});
test("làm quen: hôm sau → việc 2; việc chưa làm thì vẫn chờ", () => {
  assert.equal(onboardView({ n: 1, last: "2026-10-31", day: "2026-11-01" }).n, 2);
  assert.equal(onboardView({ n: 1, last: "2026-10-31", day: "2026-11-05" }).n, 2);
  const v3 = onboardView({ n: 2, last: "2026-11-01", day: "2026-11-02" });
  assert.equal(v3.task.act, "weigh"); assert.equal(v3.task.pts, 50);
});
test("làm quen: xong cả 3 → ăn mừng đúng ngày đó, hôm sau ẩn; null → ẩn", () => {
  assert.deepEqual(onboardView({ n: 3, last: "2026-11-02", day: "2026-11-02" }), { kind: "party", total: 120 });
  assert.equal(onboardView({ n: 3, last: "2026-11-02", day: "2026-11-03" }), null);
  assert.equal(onboardView(null), null);
  assert.equal(ONBOARD_TOTAL, 120);
});
test("làm quen: hỏi bật nhắc chỉ khi vừa 0 → 1", () => {
  assert.equal(justFinishedFirst({ n: 0 }, { n: 1 }), true);
  assert.equal(justFinishedFirst({ n: 1 }, { n: 1 }), false);
  assert.equal(justFinishedFirst(null, { n: 1 }), false);
});
test("làm quen: SQL thưởng 30/40/50, không tính trần ngày, pet_claim gọi soát", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261031140000_pi_lam_quen.sql", import.meta.url), "utf8");
  assert.match(sql, /array\[30, 40, 50\]/);
  assert.match(sql, /kind not in \('admin', 'invite', 'rank', 'onboard'\)/);
  assert.match(sql, /perform public\.pet_onboard_tick\(v_uid\);\s*return public\.pet_state_json\(v_uid\);/);
  assert.match(sql, /interval '14 days'/);
});
