// Flow giảm cân (bản vẽ 131a–f, 18/10) — hàm thuần, có test (tests/loss-plan.test.mjs).
import { addDays } from "./dateVN.js";

const r1 = (n) => Math.round(n * 10) / 10;
export const bmiOf = (kg, cm) => (Number(kg) > 0 && Number(cm) > 0 ? Number(kg) / ((Number(cm) / 100) ** 2) : null);
export const kgAtBmi = (bmi, cm) => r1(bmi * ((Number(cm) / 100) ** 2));

// 131b: chip "muốn giảm bao nhiêu" (sửa 18/10: trước đây chỉ chặn BMI 18,5 nên số nào cũng "hợp lý")
// Mức đẹp theo chiều cao = BMI 20–23 (chuẩn người châu Á). Chip chỉ gồm mức mà cân đích còn ≥ BMI 20;
// gợi ý sẵn mức về gần BMI 23 nhưng chặng đầu tối đa ~12% cân hiện tại.
const STEPS = [2, 3, 5, 8, 10, 15, 20];
export const goodRange = (cm) => ({ lo: Math.ceil(kgAtBmi(20, cm)), hi: Math.floor(kgAtBmi(23, cm)) });
export function lossChoices(kg, cm) {
  const k = Number(kg);
  if (!(k > 0) || !(Number(cm) > 0)) return { options: [5, 8, 10], pick: 5, minKg: null, normal: false };
  const minKg = kgAtBmi(18.5, cm);
  const valid = STEPS.filter((d) => k - d >= kgAtBmi(20, cm));
  const normal = k <= kgAtBmi(23, cm); // đang trong mức chuẩn rồi
  if (!valid.length) return { options: [], pick: "x", minKg, normal: true };
  const want = Math.max(2, Math.min(k - kgAtBmi(23, cm), k * 0.12));
  const pick = valid.reduce((best, d) => (Math.abs(d - want) < Math.abs(best - want) ? d : best), valid[0]);
  const i = valid.indexOf(pick), start = Math.max(0, Math.min(i - 2, valid.length - 3));
  return { options: valid.slice(start, start + 3), pick, minKg, normal };
}

// Nhận xét cân đích (đã qua goalError): tone ok / warn + câu hiện dưới chip
export function goalVerdict(kg, goalKg, cm) {
  const k = Number(kg), g = Number(goalKg), b = bmiOf(g, cm);
  if (!(g > 0) || !b) return null;
  const { lo, hi } = goodRange(cm);
  const f = (n) => String(n).replace(".", ",");
  const range = `${lo}–${hi} kg`;
  if (b < 20) return { tone: "warn", text: `→ còn ${f(g)} kg · hơi gầy so với ${Math.round(cm)} cm, dễ tăng cân lại. Mức đẹp của bạn: ${range}.` };
  if (k - g > k * 0.15) return { tone: "warn", text: `→ còn ${f(g)} kg · giảm nhiều một lúc dễ bỏ cuộc — nên làm chặng đầu −${Math.round(k * 0.1)} kg trước.` };
  if (b > 23) return { tone: "ok", text: `→ còn ${f(g)} kg · chặng đầu vừa sức. Mức đẹp với chiều cao của bạn: ${range}.` };
  return { tone: "ok", text: `→ còn ${f(g)} kg · đúng mức đẹp với chiều cao của bạn (${range}).` };
}

// Kiểm cân đích tự nhập: phải nhỏ hơn cân hiện tại và ≥ BMI 18,5
export function goalError(kg, goalKg, cm) {
  const g = Number(goalKg), k = Number(kg);
  if (!(g > 0)) return "Nhập cân bạn muốn đạt";
  if (g >= k) return `Cân muốn đạt phải nhỏ hơn cân hiện tại (${String(k).replace(".", ",")} kg)`;
  const minKg = kgAtBmi(18.5, cm);
  if (g < minKg) return `Thấp quá so với chiều cao — tối thiểu khoảng ${String(minKg).replace(".", ",")} kg`;
  return null;
}

// 131d: dòng trả lời "Hôm nay mình ổn không?" ở header Hôm nay
// rows: mealRows (state eaten / planned / empty / missed), nextName: tên bữa sắp tới (đã có món → "ăn X như thực đơn")
export function lossStatus({ target, eaten, rows = [], nowMinutes = 0 }) {
  const t = Number(target) || 0, e = Number(eaten) || 0;
  const remain = Math.round(t - e);
  const open = rows.filter((r) => r.state !== "eaten");
  const next = open.find((r) => (r.minutes ?? 0) + 60 >= nowMinutes) || open[0] || null;
  const nextFoods = next && next.state === "planned" && next.items?.length ? next.items.map((i) => i.display || i.food || i.name).filter(Boolean).slice(0, 2).join(", ") : null;
  if (t > 0 && e > t * 1.1) return { tone: "over", title: "Hôm nay hơi quá kế hoạch", sub: "Không sao — mai ăn như thực đơn là được, đừng bỏ bữa." };
  if (t > 0 && e > t) return { tone: "warn", title: "Hơi dư một chút", sub: open.length ? "Các bữa còn lại ăn nhẹ hơn là bù lại." : "Mai ăn như thực đơn là được." };
  if (!open.length) return { tone: "ok", title: "Hôm nay đạt kế hoạch 👍", sub: e > 0 ? `Đã ăn ${Math.round(e).toLocaleString("vi-VN")} / ${Math.round(t).toLocaleString("vi-VN")} kcal — giữ vậy là giảm đều.` : "Ghi bữa để app theo dõi giúp bạn." };
  if (e === 0) return { tone: "ok", title: "Bắt đầu ngày mới 💪", sub: nextFoods ? `${next.name}: ${nextFoods} — ăn theo thực đơn là đạt.` : `Hôm nay ăn khoảng ${Math.round(t).toLocaleString("vi-VN")} kcal là đúng kế hoạch.` };
  return { tone: "ok", title: "Đang đúng kế hoạch 👍", sub: nextFoods ? `${next.name} ăn ${nextFoods} như thực đơn là đạt.` : `Còn ${remain.toLocaleString("vi-VN")} kcal cho ${open.map((r) => r.name.toLowerCase()).join(", ")}.` };
}

// Chuỗi ngày ghi liên tục (có ít nhất 1 bữa đã ăn), tính tới hôm nay (hôm nay chưa ghi vẫn giữ chuỗi tới hôm qua)
export function streakDays(dayRows = [], today) {
  const set = new Set((dayRows || []).filter((r) => (r.eaten_meals || []).length > 0).map((r) => String(r.log_date).slice(0, 10)));
  let d = set.has(today) ? today : addDays(today, -1), n = 0;
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

// 131e: mốc ăn mừng
export function milestones({ startKg, curKg, goalKg, waistFrom = null, waistTo = null }) {
  const lost = r1((Number(startKg) || 0) - (Number(curKg) || 0));
  const pct5 = r1((Number(startKg) || 0) * 0.05);
  const out = [
    { k: "2kg", label: "−2 kg", done: lost >= 2 },
    { k: "5pct", label: "−5% cân", done: lost >= pct5 && pct5 > 0 },
  ];
  if (waistFrom != null && waistTo != null) out.push({ k: "waist5", label: "Eo −5 cm", done: Number(waistFrom) - Number(waistTo) >= 5 });
  else out.push({ k: "half", label: "Nửa chặng", done: lost >= ((Number(startKg) || 0) - (Number(goalKg) || 0)) / 2 && lost > 0 });
  out.push({ k: "goal", label: `${String(goalKg).replace(".", ",")} kg`, done: Number(curKg) <= Number(goalKg) });
  return out;
}
