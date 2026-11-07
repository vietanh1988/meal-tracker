// 08/11 (chủ dự án duyệt bản vẽ "Pi khoẻ dần lên"): Sức khoẻ Pi 0–100% theo việc ăn uống / tập thật, KHÔNG bao giờ béo / gầy.
// Mỗi ngày đã qua: ghi đủ bữa +15 · đủ đạm +10 · tập xong buổi đúng ngày tập +5 · không ghi bữa nào −20. Giữ trong 0–100.
// Hôm nay: chỉ cộng phần đã làm được (chưa trừ vì ngày chưa hết). Ngày trước khi bắt đầu dùng app không tính.
// Hàm thuần (tests/pi-health.test.mjs); ngày giờ theo VN qua dateVN.
import { addDays, diffDays } from "./dateVN.js";
import { eatenTotals, sumItems, mealKey } from "./mealMath.js";

export const HEALTH = { start: 50, full: 15, protein: 10, gym: 5, miss: -20, days: 14, high: 80, low: 35, pRatio: 0.9, minMealKcal: 100 };
const clamp = (x) => Math.max(0, Math.min(100, x));

/** việc làm được trong 1 ngày. row = daily_logs; gym = { planned, done } */
export function dayDone(row, { pTarget = 0, fullN = 3, gym = {} } = {}) {
  const eaten = new Set(row?.eaten_meals || []);
  const meals = (row?.meals || []).filter((m) => eaten.has(mealKey(m)));
  const n = meals.filter((m) => sumItems(m.items).cal >= HEALTH.minMealKcal).length;
  const p = eatenTotals(row?.meals || [], row?.eaten_meals || []).p;
  return {
    meals: n,
    full: n >= Math.max(1, fullN),
    protein: n > 0 && pTarget > 0 && p >= pTarget * HEALTH.pRatio,
    gym: !!(gym.planned && gym.done),
    gymPlanned: !!gym.planned,
  };
}
const gainOf = (d) => (d.meals === 0 ? HEALTH.miss : (d.full ? HEALTH.full : 0) + (d.protein ? HEALTH.protein : 0) + (d.gym ? HEALTH.gym : 0));

/**
 * rows: daily_logs các ngày trước (có thể gồm hôm nay, bỏ qua), todayRow: bản hôm nay đang dùng.
 * gymOf(date) → { planned, done }. Trả { pct, stage: "met"|"vua"|"khoe", streak, today: dayDone, next: { key, pct } | null }
 */
export function healthOf({ rows = [], todayRow = null, today, pTarget = 0, fullN = 3, gymOf = () => ({}) }) {
  const by = new Map((rows || []).filter((r) => r?.log_date && r.log_date < today).map((r) => [r.log_date, r]));
  const used = [...by.values()].filter((r) => (r.eaten_meals || []).length || (r.meals || []).length).map((r) => r.log_date).sort();
  let v = HEALTH.start, run = 0;
  if (used.length) {
    const from = used[0] > addDays(today, -HEALTH.days) ? used[0] : addDays(today, -HEALTH.days);
    for (let i = 0, n = diffDays(from, today); i < n; i++) {
      const ds = addDays(from, i);
      v = clamp(v + gainOf(dayDone(by.get(ds), { pTarget, fullN, gym: gymOf(ds) })));
      run = v >= HEALTH.high ? run + 1 : 0;
    }
  }
  const td = dayDone(todayRow, { pTarget, fullN, gym: gymOf(today) });
  const pct = clamp(v + Math.max(0, gainOf(td)));
  const streak = pct >= HEALTH.high ? run + 1 : run;
  const stage = pct < HEALTH.low ? "met" : pct >= HEALTH.high ? "khoe" : "vua";
  let next = null;
  if (td.meals === 0) next = { key: "meal", pct };
  else if (!td.full) next = { key: "full", pct: clamp(pct + HEALTH.full) };
  else if (!td.protein && pTarget > 0) next = { key: "protein", pct: clamp(pct + HEALTH.protein) };
  else if (td.gymPlanned && !td.gym) next = { key: "gym", pct: clamp(pct + HEALTH.gym) };
  return { pct: Math.round(pct), stage, streak, today: td, next };
}

/** câu dưới thanh sức khoẻ */
export function healthLine(h, { variant = "nam", fullN = 3 } = {}) {
  if (!h) return "";
  const nu = variant === "nu";
  if (h.stage === "met" && h.today.meals === 0) return nu ? "Pi buồn ngủ quá… ghi 1 bữa cho Pi tỉnh nha" : "Pi buồn ngủ quá… ghi 1 bữa cho Pi tỉnh nào";
  const up = (what) => (h.next.pct > h.pct ? `${what} là Pi lên ${h.next.pct}%${nu ? " nè" : ""}` : `${what} để giữ Pi khoẻ rực${nu ? " nha" : ""}`);
  if (h.next?.key === "meal") return h.stage === "khoe" ? (nu ? "Ghi bữa hôm nay để giữ Pi khoẻ nha" : "Ghi bữa hôm nay để giữ Pi khoẻ nào") : (nu ? "Ghi bữa đầu hôm nay cho Pi khoẻ lên nha" : "Ghi bữa đầu hôm nay cho Pi khoẻ lên nào");
  if (h.next?.key === "full") return up(`Ghi đủ ${fullN} bữa hôm nay`);
  if (h.next?.key === "protein") return up("Ăn đủ đạm hôm nay");
  if (h.next?.key === "gym") return up("Tập xong buổi hôm nay");
  if (h.stage === "khoe") return h.streak >= 2 ? `Pi khoẻ rực ${h.streak} ngày liền, cảm ơn bạn!` : "Pi khoẻ rực luôn! Cảm ơn bạn chăm Pi";
  return nu ? "Hôm nay chăm quá, Pi khoẻ hẳn ra nè" : "Hôm nay chăm quá, Pi khoẻ hẳn ra!";
}
