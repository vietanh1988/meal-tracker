// 30/10: Hỏi Pi phải có hồ sơ + nhật ký 30 ngày + cân + số đo (src/pi/chatContext.js)
import test from "node:test";
import assert from "node:assert/strict";
import { buildPiContext, diarySummary, profileLine, weightLine, measureLine } from "../src/pi/chatContext.js";

const today = "2026-10-30";
const day = (d, eaten, extra = {}) => ({ log_date: d, meals: [
  { meal_id: "sang", items: [{ food: "Phở bò", cal: 450, p: 25, c: 55, f: 12 }] },
  { meal_id: "trua", items: [{ food: "Cơm tấm sườn", cal: 750, p: 30, c: 90, f: 28 }] },
], eaten_meals: eaten, water_ml: 1500, ...extra });

test("hồ sơ: tuổi, cao, mục tiêu", () => {
  const s = profileLine({ gender: "male", birthYear: 1988, cm: 172, kg: 70, goalType: "cut", goalKg: 65, gymDays: [0, 2, 4] }, today);
  assert.match(s, /nam, 38 tuổi, cao 172 cm/);
  assert.match(s, /giảm mỡ.*về 65 kg/);
  assert.match(s, /tập 3 buổi/);
});

test("nhật ký: chỉ tính bữa đã ăn, bỏ hôm nay và ngày ngoài 30 ngày", () => {
  const rows = [day("2026-10-28", ["sang", "trua"]), day("2026-10-29", ["sang"]), day(today, ["sang", "trua"]), day("2026-09-01", ["sang"]), day("2026-10-20", [])];
  const s = diarySummary(rows, today, { target: { cal: 1800, p: 120 } });
  assert.match(s, /2 ngày có ghi/);
  assert.match(s, /Trung bình mỗi ngày có ghi: 825 kcal/); // (1200 + 450) / 2
  assert.match(s, /Phở bò 2 lần/);
  assert.match(s, /Cơm tấm sườn 1 lần/);
  assert.match(s, /2 ngày thiếu đạm/);
  assert.match(s, /28\/10 1200\/55/);
});

test("nhật ký trống → nói rõ chưa đủ dữ liệu", () => {
  assert.match(diarySummary([], today), /chưa có ngày nào/);
});

test("cân + số đo", () => {
  assert.match(weightLine([{ logged_date: "2026-10-01", kg: 72 }, { logged_date: "2026-10-29", kg: 70.5 }], today), /72 kg.*70\.5 kg.*giảm 1\.5 kg/);
  assert.match(measureLine([{ log_date: "2026-10-01", belly: 90 }, { log_date: "2026-10-25", belly: 88, waist: 80 }]), /bụng 88 cm, lần đầu 01\/10 90 cm/);
  assert.match(measureLine([]), /chưa đo/);
});

test("ghép đủ 4 phần", () => {
  const s = buildPiContext({ profile: { cm: 170 }, rows: [day("2026-10-29", ["sang"])], weightLog: [], measures: [], today });
  assert.equal(s.split("\n").filter((l) => /^(Hồ sơ|Nhật ký|Cân nặng|Số đo)/.test(l)).length, 4);
});
