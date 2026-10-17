// Vận động thêm trong ngày (bản vẽ 130a–c, 17/10) — hàm thuần, có test (tests/activity.test.mjs).
// kcal = MET × kg × giờ × 0,8 (tính thấp 20% cho an toàn), làm tròn 10; cộng dồn trong ngày, tối đa 400 kcal.
// Cộng vào mục tiêu ngày: Tăng cơ 100% · Duy trì 50% · Giảm mỡ 0 (đốt > 300 kcal mới cộng 50%).
export const ACTS = [
  { id: "walk", label: "Đi bộ", emoji: "🚶", met: 3.5 },
  { id: "run", label: "Chạy", emoji: "🏃", met: 8 },
  { id: "ball", label: "Bóng / cầu lông", emoji: "⚽", met: 6 },
  { id: "swim", label: "Bơi", emoji: "🏊", met: 6 },
  { id: "bike", label: "Đạp xe", emoji: "🚴", met: 5 },
  { id: "other", label: "Khác", emoji: "➕", met: 4 },
];
export const MINUTES = [15, 30, 45, 60, 90];
export const DAY_CAP = 400;
export const actOf = (id) => ACTS.find((a) => a.id === id) || ACTS[ACTS.length - 1];
export const stepsToMin = (steps) => Math.round((Number(steps) || 0) / 100); // 1.000 bước ≈ 10 phút đi bộ
const r10 = (n) => Math.round(n / 10) * 10;

export function actKcal(id, min, kg) {
  const m = Math.max(0, Math.min(600, Number(min) || 0));
  return r10(actOf(id).met * (Number(kg) || 60) * (m / 60) * 0.8);
}

// Tổng đốt thêm trong ngày (đã kẹp tối đa 400)
export const dayBurn = (items) => Math.min(DAY_CAP, (items || []).reduce((s, i) => s + (Number(i.kcal) || 0), 0));

// Phần cộng vào mục tiêu ngày theo mục tiêu
export function activityBonus(burn, goal) {
  const b = Number(burn) || 0;
  if (goal === "bulk") return b;
  if (goal === "maintain") return r10(b * 0.5);
  return b > 300 ? r10(b * 0.5) : 0;
}

// Macro của ngày có vận động: cộng phần thêm vào calo + tinh bột (cả ngày tập lẫn nghỉ)
export function withBonus(macro, bonus) {
  const b = Number(bonus) || 0;
  if (!b || !macro) return macro;
  const c = Math.round(b / 4);
  return { ...macro, calTarget: (macro.calTarget || 0) + b, calRest: (macro.calRest || 0) + b, carb: (macro.carb || 0) + c, carbRest: (macro.carbRest || 0) + c, activityBonus: b };
}

// Gợi ý món để ăn bù phần vận động (dải xanh ở thẻ bữa đến giờ)
export const bonusTip = (kcal) => (kcal <= 120 ? "thêm 1 quả trứng hoặc 1 hộp sữa chua" : kcal <= 220 ? "thêm 1 chén cơm hoặc 1 quả trứng" : "thêm 1 chén cơm + 1 quả trứng");

// Tóm tắt "Đi bộ 45 phút" hoặc "Đi bộ 45 phút + Chạy 20 phút"
export const actSummary = (items) => (items || []).map((i) => `${actOf(i.type).label} ${i.min} phút`).join(" + ");

// Bữa phụ nhẹ (bản vẽ 130c) — số liệu khẩu phần thường gặp
export const SNACKS = [
  { id: "yogurt_banana", name: "Sữa chua + 1 quả chuối nhỏ", items: [{ food: "Sữa chua", gram: 100, cal: 95, p: 4, c: 14, f: 3 }, { food: "Chuối", gram: 80, cal: 70, p: 1, c: 18, f: 0 }] },
  { id: "milk", name: "1 hộp sữa tươi ít đường", items: [{ food: "Sữa tươi ít đường", gram: 180, cal: 140, p: 6, c: 17, f: 6 }] },
  { id: "egg_bread", name: "1 quả trứng luộc + 1 lát bánh mì", items: [{ food: "Trứng gà luộc", gram: 50, cal: 72, p: 6, c: 0, f: 5 }, { food: "Bánh mì", gram: 30, cal: 80, p: 3, c: 15, f: 1 }] },
].map((s) => ({ ...s, cal: s.items.reduce((a, i) => a + i.cal, 0), p: s.items.reduce((a, i) => a + i.p, 0) }));
