import { test } from "node:test";
import assert from "node:assert/strict";
import * as B from "../src/lib/bodyMeasure.js";

test("parseCm / parseFat / cleanValues", () => {
  assert.equal(B.parseCm("82,5"), 82.5);
  assert.equal(B.parseCm("5"), null);
  assert.equal(B.parseCm(""), null);
  assert.equal(B.parseFat("18,46"), 18.5);
  assert.deepEqual(B.cleanValues({ waist: "82", belly: "", chest: "abc", body_fat: "70" }), { waist: 82 });
});

const rows = [
  { log_date: "2026-09-01", waist: 85.5, belly: 91, chest: 97 },
  { log_date: "2026-10-09", waist: 83.5, belly: 90 },
  { log_date: "2026-10-16", waist: 82, chest: 98 },
  { log_date: "2026-10-17" },
];
test("latestByField: mỗi ô lấy số mới nhất của ô đó + delta với lần trước của ô đó", () => {
  const L = B.latestByField(rows);
  assert.equal(L.waist.v, 82); assert.equal(L.waist.delta, -1.5);
  assert.equal(L.belly.v, 90); assert.equal(L.belly.date, "2026-10-09");
  assert.equal(L.chest.delta, 1);
  assert.equal(L.hip, undefined);
});
test("deltaTone theo mục tiêu", () => {
  assert.equal(B.deltaTone("waist", -1, "cut"), "good");
  assert.equal(B.deltaTone("waist", 1, "cut"), "bad");
  assert.equal(B.deltaTone("waist", 1, "bulk"), "neutral");
  assert.equal(B.deltaTone("arm", 0.5, "bulk"), "good");
  assert.equal(B.deltaTone("arm", -0.5, "cut"), "neutral");
  assert.equal(B.deltaTone("thigh", 1, "bulk"), "good");
  assert.equal(B.deltaTone("body_fat", -0.8, "bulk"), "good");
  assert.equal(B.deltaTone("hip", 0, "cut"), null);
});
test("waistHeight", () => { assert.equal(B.waistHeight(82, 170), 0.48); assert.equal(B.waistHeight(null, 170), null); });
test("measureSeries 8 tuần lọc theo ngày", () => {
  const s = B.measureSeries(rows, "waist", "8w", "2026-10-17");
  assert.equal(s.points.length, 3);
  assert.equal(s.change, -3.5);
  assert.equal(B.measureSeries(rows, "waist", "8w", "2026-12-31").points.length, 0);
});
test("bodyInsight: cân đứng, eo giảm → tốt; bulk eo tăng nhiều → cảnh báo; thiếu dữ liệu → null", () => {
  const wl = [{ logged_date: "2026-10-01", kg: 70 }, { logged_date: "2026-10-16", kg: 70.2 }];
  const i = B.bodyInsight({ weightLog: wl, rows: [{ log_date: "2026-10-01", waist: 84 }, { log_date: "2026-10-16", waist: 82.5 }], goalType: "cut" });
  assert.equal(i.tone, "good"); assert.match(i.text, /eo nhỏ đi 1,5 cm/);
  const w2 = [{ logged_date: "2026-09-01", kg: 65 }, { logged_date: "2026-10-01", kg: 67 }];
  const j = B.bodyInsight({ weightLog: w2, rows: [{ log_date: "2026-09-01", waist: 78 }, { log_date: "2026-10-01", waist: 81 }], goalType: "bulk" });
  assert.equal(j.tone, "warn");
  assert.equal(B.bodyInsight({ weightLog: wl, rows: [{ log_date: "2026-10-15", waist: 84 }, { log_date: "2026-10-16", waist: 82 }] }), null);
  assert.equal(B.bodyInsight({ weightLog: [], rows: [] }), null);
});
test("measureSummaryForAI", () => {
  assert.equal(B.measureSummaryForAI([], 170), null);
  assert.match(B.measureSummaryForAI(rows, 170), /Eo 82 cm \(-1,5 so với lần trước\).*Eo\/chiều cao 0,48/);
});
