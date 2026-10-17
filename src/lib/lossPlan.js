// Flow giảm cân (bản vẽ 131a–f, 18/10) — hàm thuần, có test (tests/loss-plan.test.mjs).
import { addDays } from "./dateVN.js";

const r1 = (n) => Math.round(n * 10) / 10;
export const bmiOf = (kg, cm) => (Number(kg) > 0 && Number(cm) > 0 ? Number(kg) / ((Number(cm) / 100) ** 2) : null);
export const kgAtBmi = (bmi, cm) => r1(bmi * ((Number(cm) / 100) ** 2));

// 131b: chip "muốn giảm bao nhiêu" — chỉ các mức mà cân đích vẫn ≥ BMI 18,5; gợi ý sẵn mức gần nhất để về ~BMI 23
export function lossChoices(kg, cm) {
  const k = Number(kg), minKg = kgAtBmi(18.5, cm);
  if (!(k > 0) || !(Number(cm) > 0)) return { options: [5, 8, 10], pick: 5, minKg: null };
  const options = [5, 8, 10].filter((d) => k - d >= minKg);
  const need = k - kgAtBmi(23, cm);
  const pick = options.length ? options.reduce((best, d) => (Math.abs(d - need) < Math.abs(best - need) ? d : best), options[0]) : null;
  return { options, pick, minKg };
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
