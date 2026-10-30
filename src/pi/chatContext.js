// 30/10 (chủ dự án: "Pi không đọc được profile và nhật ký nên không tư vấn được"):
// dựng phần "dữ liệu thật" đưa vào lời dặn AI của Hỏi Pi — hồ sơ, nhật ký ăn 30 ngày (daily_logs: số đã ăn = meals ∩ eaten_meals),
// cân nặng, số đo. Hàm thuần, có test (tests/pi-context.test.mjs). Ngày theo giờ VN (dateVN), không tự tính "hôm nay".
import { eatenTotals, sumItems, mealKey } from "../lib/mealMath.js";
import { addDays, diffDays } from "../lib/dateVN.js";

const GOAL = { cut: "giảm mỡ / giảm cân", bulk: "tăng cơ / tăng cân", maintain: "giữ cân" };
const ACT = { sedentary: "ít vận động", light: "vận động nhẹ", moderate: "vận động vừa", active: "vận động nhiều", very_active: "vận động rất nhiều" };
const MEASURE = { chest: "ngực", waist: "eo", belly: "bụng", hip: "mông", arm: "bắp tay", thigh: "đùi", body_fat: "% mỡ" };
const r = (n) => Math.round(Number(n) || 0);
const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const dm = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

export function profileLine(profile = {}, today) {
  const p = profile || {}, out = [];
  if (p.gender) out.push(p.gender === "female" ? "nữ" : "nam");
  const y = Number(String(today || "").slice(0, 4));
  if (p.birthYear && y) out.push(`${y - p.birthYear} tuổi`);
  if (p.cm) out.push(`cao ${p.cm} cm`);
  if (p.kg) out.push(`cân trong hồ sơ ${r1(p.kg)} kg`);
  if (p.goalType) out.push(`mục tiêu ${GOAL[p.goalType] || p.goalType}${p.goalType !== "maintain" && p.goalKg ? ` về ${r1(p.goalKg)} kg` : ""}`);
  if (p.exerciseType === "none") out.push("không tập gym");
  else if (Array.isArray(p.gymDays)) out.push(`tập ${p.gymDays.length} buổi / tuần`);
  if (p.activity && ACT[p.activity]) out.push(ACT[p.activity]);
  return out.length ? `Hồ sơ: ${out.join(", ")}.` : "";
}

/** Tóm tắt nhật ký ăn [today-29, today-1] (không gồm hôm nay — hôm nay có dòng riêng). */
export function diarySummary(rows = [], today, { days = 30, target } = {}) {
  const from = addDays(today, -days);
  const list = (rows || []).filter((x) => x && x.log_date >= from && x.log_date < today).sort((a, b) => (a.log_date < b.log_date ? -1 : 1));
  const ate = list.map((x) => ({ d: x.log_date, t: eatenTotals(x.meals || [], x.eaten_meals || []), n: (x.eaten_meals || []).length, w: Number(x.water_ml) || 0, x })).filter((x) => x.n > 0);
  if (!ate.length) return `Nhật ký ${days} ngày qua: chưa có ngày nào bấm Đã ăn (chưa đủ dữ liệu để nhận xét cả tháng).`;
  const avg = (k) => ate.reduce((a, x) => a + x.t[k], 0) / ate.length;
  const lines = [`Nhật ký ${days} ngày qua (${dm(addDays(today, -days))}–${dm(addDays(today, -1))}): ${ate.length} ngày có ghi và bấm Đã ăn.`];
  lines.push(`Trung bình mỗi ngày có ghi: ${r(avg("cal"))} kcal, đạm ${r(avg("p"))} g, tinh bột ${r(avg("c"))} g, béo ${r(avg("f"))} g, chất xơ ${r(avg("fiber"))} g.`);
  if (target && target.cal) {
    const over = ate.filter((x) => x.t.cal > target.cal * 1.1).length, lowP = target.p ? ate.filter((x) => x.t.p < target.p * 0.8).length : 0;
    lines.push(`So với mục tiêu hiện tại (${r(target.cal)} kcal, đạm ${r(target.p)} g): ${over} ngày vượt calo hơn 10%, ${lowP} ngày thiếu đạm hơn 20%.`);
  }
  const water = ate.filter((x) => x.w > 0);
  if (water.length) lines.push(`Nước: ${water.length} ngày có ghi, trung bình ${r(water.reduce((a, x) => a + x.w, 0) / water.length)} ml.`);
  // món hay ăn (chỉ bữa đã ăn)
  const cnt = {};
  ate.forEach(({ x }) => {
    const set = new Set(x.eaten_meals || []);
    (x.meals || []).filter((m) => set.has(mealKey(m))).forEach((m) => (m.items || []).forEach((i) => {
      const k = String(i.food || i.name || "").trim();
      if (!k) return;
      const c = cnt[k] || (cnt[k] = { n: 0, cal: 0 });
      c.n += 1; c.cal += sumItems([i]).cal;
    }));
  });
  const top = Object.entries(cnt).sort((a, b) => b[1].n - a[1].n).slice(0, 10);
  if (top.length) lines.push(`Món ăn nhiều nhất: ${top.map(([k, v]) => `${k} ${v.n} lần (~${r(v.cal / v.n)} kcal)`).join("; ")}.`);
  const gap = diffDays(ate[ate.length - 1].d, today) - 1;
  if (gap > 0) lines.push(`Lần ghi gần nhất cách hôm nay ${gap + 1} ngày.`);
  lines.push(`Từng ngày (kcal / đạm g): ${ate.slice(-14).map((x) => `${dm(x.d)} ${r(x.t.cal)}/${r(x.t.p)}`).join(", ")}.`);
  return lines.join("\n");
}

export function weightLine(weightLog = [], today, days = 60) {
  const from = addDays(today, -days);
  const w = (weightLog || []).filter((x) => x && x.logged_date && x.logged_date >= from && x.logged_date <= today && Number(x.kg)).sort((a, b) => (a.logged_date < b.logged_date ? -1 : 1));
  if (!w.length) return `Cân nặng: chưa cân trong ${days} ngày qua.`;
  const a = w[0], b = w[w.length - 1];
  if (w.length === 1) return `Cân nặng: ${r1(b.kg)} kg (${dm(b.logged_date)}).`;
  const d = r1(b.kg - a.kg);
  return `Cân nặng: ${r1(a.kg)} kg (${dm(a.logged_date)}) → ${r1(b.kg)} kg (${dm(b.logged_date)}), ${d > 0 ? "tăng" : d < 0 ? "giảm" : "giữ"} ${Math.abs(d)} kg sau ${w.length} lần cân.`;
}

export function measureLine(measures = []) {
  const m = (measures || []).filter(Boolean).sort((a, b) => (a.log_date < b.log_date ? -1 : 1));
  if (!m.length) return "Số đo cơ thể: chưa đo.";
  const b = m[m.length - 1], a = m[0];
  const parts = Object.keys(MEASURE).filter((k) => b[k] != null).map((k) => {
    const u = k === "body_fat" ? "%" : " cm";
    const prev = a !== b && a[k] != null ? `, lần đầu ${dm(a.log_date)} ${r1(a[k])}${u}` : "";
    return `${MEASURE[k]} ${r1(b[k])}${u}${prev}`;
  });
  return parts.length ? `Số đo gần nhất (${dm(b.log_date)}): ${parts.join("; ")}.` : "Số đo cơ thể: chưa đo.";
}

/** Toàn bộ phần dữ liệu cho Hỏi Pi (ngoài dòng "số thật hôm nay"). */
export function buildPiContext({ profile, rows, weightLog, measures, today, target } = {}) {
  return [profileLine(profile, today), diarySummary(rows, today, { target }), weightLine(weightLog, today), measureLine(measures)].filter(Boolean).join("\n");
}
