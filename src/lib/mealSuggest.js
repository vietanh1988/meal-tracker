// Gợi ý món cho 1 bữa (16/10): thay nút "Ăn lại …" tự áp ở thẻ bữa Hôm nay.
// Trả tối đa `limit` lựa chọn để người dùng CHỌN, đồng bộ hồ sơ:
//  - calo mục tiêu của bữa = mục tiêu ngày (theo mục tiêu tăng/giảm/giữ, ngày tập/nghỉ) chia theo trọng số bữa (mealEngine)
//  - bỏ món người dùng ghi "không ăn / dị ứng" (tab Thực đơn)
//  - mẫu admin chỉ lấy mẫu hợp mục tiêu + kiểu ăn (libraryFor ở nơi gọi)
// Nguồn: bữa đã ăn trước (cùng bữa), thực đơn mẫu, thực đơn AI đã tạo. Khẩu phần chỉnh theo calo bữa:
// mẫu / AI chạy lại mealEngine (đạm → béo → tinh bột), bữa đã ăn nhân đều theo tỉ lệ (giới hạn 0,7–1,4 lần).
import { splitDayIntoMeals, applyMealEngineToTemplate } from "../mealEngine.js";
import { dailyTargetOf } from "./menuView.js";
import { scaleItem } from "./mobileView.js";

const norm = (s) => String(s || "").toLowerCase().trim();
const keyOf = (it) => norm(it.food || it.name || it.display);
const sigOf = (items) => items.map(keyOf).sort().join("|");
const calOf = (items) => Math.round((items || []).reduce((s, i) => s + (Number(i.cal) || 0), 0));
const valid = (items) => (items || []).filter((i) => (Number(i.gram) || 0) > 0 && (Number(i.cal) || 0) >= 0);

// Mục tiêu calo/macro của 1 bữa theo các bữa đang bật trong ngày
export function mealTargetOf(macro, dayType, mealIds, mealId) {
  const ids = (mealIds || []).includes(mealId) ? mealIds : [...(mealIds || []), mealId];
  return splitDayIntoMeals(dailyTargetOf(macro, dayType), ids)[mealId] || null;
}

// Nhân đều khẩu phần cho gần calo mục tiêu; gram làm tròn 5 g, giữ đơn vị (bát, quả…) của món
export function fitItems(items, targetCal, { min = 0.7, max = 1.4 } = {}) {
  const cal = calOf(items);
  if (!cal || !targetCal) return items;
  const k = Math.max(min, Math.min(max, targetCal / cal));
  if (Math.abs(k - 1) < 0.05) return items;
  return items.map((it) => {
    const g = Math.max(5, Math.round(((Number(it.gram) || 0) * k) / 5) * 5);
    const { qty_display, ...rest } = scaleItem(it, g); // eslint-disable-line no-unused-vars
    return { ...rest, unit: it.unit, unit_g: it.unit_g, unit_mode: it.unit_mode };
  });
}

// Chạy mealEngine cho 1 bữa của mẫu: target của bữa = mealTarget (1 bữa → nhận đủ 100%)
function engineMeal(meal, mealTarget) {
  const out = applyMealEngineToTemplate({ meals: [{ ...meal, meal_id: meal.meal_id }] }, mealTarget).meals[0];
  const src = meal.items || [];
  return (out.items || []).map((it) => {
    const s = src.find((x) => keyOf(x) === keyOf(it));
    return s && s.display ? { ...it, display: s.display } : it;
  });
}

/**
 * @returns [{ id, kind: "history"|"template"|"ai", title, date?, items, cal, target, dev }]
 */
export function mealSuggestions({ mealId, mealIds, macro, dayType, history = [], templates = [], aiMenus = [], avoidKeys = null, isAvoided = null, currentItems = [], limit = 5 }) {
  const target = mealTargetOf(macro, dayType, mealIds, mealId);
  const tCal = target?.cal || 0;
  const avoid = avoidKeys instanceof Set ? avoidKeys : new Set(avoidKeys || []);
  const banned = (items) => items.some((i) => avoid.has(keyOf(i)) || (isAvoided && (isAvoided(i.display || "") || isAvoided(i.food || i.name || ""))));
  const seen = new Set();
  const cur = valid(currentItems);
  if (cur.length) seen.add(sigOf(cur));
  const out = [];
  const push = (kind, title, items, extra = {}) => {
    const its = valid(items);
    if (!its.length || banned(its)) return;
    const sig = sigOf(its);
    if (seen.has(sig)) return;
    seen.add(sig);
    const cal = calOf(its);
    out.push({ id: `${kind}:${sig}`, kind, title, items: its, cal, target: tCal, dev: tCal ? (cal - tCal) / tCal : 0, ...extra });
  };

  // 1) Bữa đã ăn trước (cùng bữa), mới nhất trước — tối đa 3 để chừa chỗ món mới
  let nHist = 0;
  for (const h of history) {
    if (nHist >= 3) break;
    if (h.meal_id !== mealId || !(h.items || []).length) continue;
    const before = out.length;
    push("history", "Ăn lại", fitItems(h.items, tCal), { date: h.log_date, scaled: Math.abs(calOf(h.items) - tCal) > tCal * 0.05 });
    if (out.length > before) nHist++;
  }
  // 2) Thực đơn mẫu hợp mục tiêu (đã lọc ở nơi gọi) — chạy lại mealEngine theo calo bữa
  for (const t of templates) {
    const m = (t.meals || []).find((x) => x.meal_id === mealId && (x.items || []).length);
    if (!m || !target) continue;
    push("template", t.name || "Thực đơn mẫu", engineMeal(m, target));
  }
  // 3) Thực đơn AI đã tạo — chỉnh khẩu phần theo calo bữa
  for (const a of aiMenus) {
    const m = ((a.template && a.template.meals) || []).find((x) => x.meal_id === mealId && (x.items || []).length);
    if (!m) continue;
    push("ai", "Thực đơn AI", fitItems(m.items.filter((i) => i.display !== null), tCal), { date: a.date });
  }

  // Xếp: món vừa calo trước (lệch ≤ 15%), trong đó ưu tiên món quen (đã ăn); giữ đa dạng nguồn
  const rank = (s) => (Math.abs(s.dev) <= 0.15 ? 0 : 1) * 10 + (s.kind === "history" ? 0 : s.kind === "template" ? 1 : 2) + Math.abs(s.dev);
  return out.sort((a, b) => rank(a) - rank(b)).slice(0, limit);
}
