// Thẻ "Kiểm tra tuần" ở Hôm nay (bản vẽ 127a–d, 17/10) — hàm thuần, có test (tests/weekly-check.test.mjs).
// Khách Giảm mỡ + Tăng cơ (129a–b, 17/10). Mỗi tuần (T2–CN) tối đa 1 lần; khách đã bấm (giữ / bớt / thêm / ×) thì ẩn tới tuần sau.
// Lần đầu: khi dữ liệu cũ nhất (lần cân / ngày ghi bữa) đã ≥ 7 ngày.
// So tốc độ giảm thật (đường xu hướng các lần cân trong 14 ngày) với tốc độ đã chọn (macro.kgWeek):
//   chưa đủ dữ liệu (< 2 lần cân cách ≥ 7 ngày, hoặc ghi bữa < 4/7 ngày) → "nodata" (127d)
//   chậm hơn ½ mục tiêu: eo nhỏ đi ≥ 1 cm → "waist" (127b, không cắt) · không thì "slow" (127a, gợi ý −100)
//   nhanh hơn 1,5 lần mục tiêu hoặc > 1% cân/tuần → "fast" (127c, gợi ý +100)
//   đúng tốc độ → null (không làm phiền)
import { addDays, diffDays, weekRange } from "./dateVN.js";

export const STEP = 100;
export const OFFSET_MIN = -300;
export const OFFSET_MAX = 300;
export const BULK_MIN = -250; // tăng cơ: không bớt dưới TDEE (+250 − 250 = 0)

const dOf = (r) => String(r?.logged_date || r?.log_date || "").slice(0, 10);

// Hệ số góc (kg/ngày) theo bình phương tối thiểu
function slopePerDay(pts) {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let num = 0, den = 0;
  pts.forEach((p) => { num += (p.x - mx) * (p.y - my); den += (p.x - mx) ** 2; });
  return den ? num / den : 0;
}

// Đến lượt hiện thẻ chưa (không xét dữ liệu cân/ăn)
export function checkinDue({ today, goal, checkinDate, firstDate }) {
  if (goal !== "cut" && goal !== "bulk") return false;
  if (checkinDate) {
    if (checkinDate >= weekRange(today).start) return false; // tuần này đã xử lý
    if (diffDays(checkinDate, today) < 5) return false;       // vừa xử lý cuối tuần trước → để tuần sau nữa
    return true;
  }
  return !!firstDate && diffDays(firstDate, today) >= 7;
}

export function weeklyCheck({ today, goal, kgWeek, curKg, weightLog = [], dayRows = [], measures = [], checkinDate = null, calOffset = 0, atFloor = false }) {
  const weights = (weightLog || []).filter((r) => dOf(r) && Number(r.kg) > 0).sort((a, b) => dOf(a).localeCompare(dOf(b)));
  const logged = new Set((dayRows || []).filter((r) => (r.eaten_meals || []).length > 0).map(dOf));
  const firstDate = [weights[0] && dOf(weights[0]), [...logged].sort()[0]].filter(Boolean).sort()[0] || null;
  if (!checkinDue({ today, goal, checkinDate, firstDate })) return null;

  const from = addDays(today, -13);
  const win = weights.filter((r) => dOf(r) >= from && dOf(r) <= today);
  const span = win.length >= 2 ? diffDays(dOf(win[0]), dOf(win[win.length - 1])) : 0;
  let days = 0;
  // 7 ngày gần nhất tính cả hôm nay (17/10: khách ghi đủ hôm nay mà thẻ vẫn đếm thiếu)
  for (let i = 0; i < 7; i++) if (logged.has(addDays(today, -i))) days++;
  const range = { from: addDays(today, -6), to: today };
  const weighedToday = win.some((r) => dOf(r) === today);
  // need: thứ còn thiếu — "meals" ghi bữa < 4/7 · "weigh" < 2 lần cân · "spread" đủ lần nhưng cách nhau < 7 ngày
  const need = days < 4 ? "meals" : win.length < 2 ? "weigh" : span < 7 ? "spread" : null;
  const base = { range, mealDays: days, weighCount: win.length, weighSpan: span, weighedToday, need };
  if (win.length < 2 || span < 7 || days < 4) return { kind: "nodata", ...base };

  const pts = win.map((r) => ({ x: diffDays(from, dOf(r)), y: Number(r.kg) }));
  const loss = Math.round(-slopePerDay(pts) * 7 * 100) / 100; // kg giảm / tuần (dương = đang giảm)
  const target = Number(kgWeek) || 0;
  const kg = Number(curKg) || Number(win[win.length - 1].kg);
  const stats = { ...base, loss, target, kgFrom: Number(win[0].kg), kgTo: Number(win[win.length - 1].kg) };

  const wm = (measures || []).filter((r) => r.waist != null && dOf(r) >= from).sort((a, b) => dOf(a).localeCompare(dOf(b)));
  const waistDiff = wm.length >= 2 ? Number(wm[wm.length - 1].waist) - Number(wm[0].waist) : null;
  // Tăng cơ (bản vẽ 129a–b): mức mong đợi = (250 + điều chỉnh) × 7 / 7.700 kg/tuần (macro.kgWeek)
  if (goal === "bulk") {
    const gain = -loss;
    const bstats = { ...stats, gain, ...(waistDiff != null ? { waistFrom: Number(wm[0].waist), waistTo: Number(wm[wm.length - 1].waist) } : {}) };
    if (gain < target / 2) return { kind: "bulk_slow", ...bstats, delta: calOffset + STEP <= OFFSET_MAX ? STEP : 0 };
    if (gain > Math.max(target * 2, 0.5) || (gain > 0 && waistDiff != null && waistDiff >= 1)) {
      return { kind: "bulk_fast", ...bstats, delta: calOffset - STEP >= BULK_MIN ? -STEP : 0 };
    }
    return null;
  }
  if (loss < target / 2) {
    if (wm.length >= 2 && Number(wm[wm.length - 1].waist) - Number(wm[0].waist) <= -1) {
      return { kind: "waist", ...stats, waistFrom: Number(wm[0].waist), waistTo: Number(wm[wm.length - 1].waist) };
    }
    const canCut = !atFloor && calOffset - STEP >= OFFSET_MIN;
    return { kind: "slow", ...stats, delta: canCut ? -STEP : 0 };
  }
  if (loss > target * 1.5 || loss > kg * 0.01) {
    return { kind: "fast", ...stats, delta: calOffset + STEP <= OFFSET_MAX ? STEP : 0 };
  }
  return null;
}

// Điều chỉnh mới sau khi khách bấm Bớt / Thêm (kẹp trong khoảng cho phép)
export const nextOffset = (cur, delta, goal = "cut") => Math.max(goal === "bulk" ? BULK_MIN : OFFSET_MIN, Math.min(OFFSET_MAX, (Number(cur) || 0) + delta));
