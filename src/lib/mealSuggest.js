// Gợi ý món cho 1 bữa (16/10): thay nút "Ăn lại …" tự áp ở thẻ bữa Hôm nay.
// Trả tối đa `limit` lựa chọn để người dùng CHỌN, đồng bộ hồ sơ:
//  - calo mục tiêu của bữa = mục tiêu ngày (theo mục tiêu tăng/giảm/giữ, ngày tập/nghỉ) chia theo trọng số bữa (mealEngine)
//  - bỏ món người dùng ghi "không ăn / dị ứng" (tab Thực đơn)
//  - mẫu admin chỉ lấy mẫu hợp mục tiêu + kiểu ăn (libraryFor ở nơi gọi)
// Nguồn: bữa đã ăn trước (cùng bữa), thực đơn mẫu, thực đơn AI đã tạo. Khẩu phần chỉnh theo calo bữa:
// mẫu / AI chạy lại mealEngine (đạm → béo → tinh bột), bữa đã ăn nhân đều theo tỉ lệ (giới hạn 0,7–1,4 lần).
import { splitDayIntoMeals, applyMealEngineToTemplate, MEAL_WEIGHTS } from "../mealEngine.js";
import { dailyTargetOf } from "./menuView.js";
import { scaleItem } from "./mobileView.js";

const norm = (s) => String(s || "").toLowerCase().trim();
const keyOf = (it) => norm(it.food || it.name || it.display);
const sigOf = (items) => items.map(keyOf).sort().join("|");
const calOf = (items) => Math.round((items || []).reduce((s, i) => s + (Number(i.cal) || 0), 0));
const valid = (items) => (items || []).filter((i) => (Number(i.gram) || 0) > 0 && (Number(i.cal) || 0) >= 0);

// Mục tiêu calo/macro của 1 bữa (phần chuẩn) theo các bữa đang bật trong ngày
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

// Mục tiêu bữa theo phần CÒN LẠI trong ngày (16/10, theo đề xuất "gợi ý bữa tối"):
// còn lại = mục tiêu ngày − các bữa khác đã ghi; chia cho các bữa chưa ghi theo trọng số bữa;
// giới hạn 0,7–1,3 lần phần chuẩn để 1 bữa không phải bù cả ngày (cũng không bắt nhịn).
// dayMeals: [{ meal_id, items }] của ngày đó. Trả { cal,p,c,f, std, remain:{cal,p,c,f}, over:{f,c} }
export function remainingMealTarget({ macro, dayType, mealIds, mealId, dayMeals = [], min = 0.7, max = 1.3 }) {
  const day = dailyTargetOf(macro, dayType);
  const std = mealTargetOf(macro, dayType, mealIds, mealId);
  if (!std) return null;
  const tot = (items) => (items || []).reduce((a, i) => ({ cal: a.cal + (Number(i.cal) || 0), p: a.p + (Number(i.p ?? i.protein) || 0), c: a.c + (Number(i.c ?? i.carb) || 0), f: a.f + (Number(i.f ?? i.fat) || 0) }), { cal: 0, p: 0, c: 0, f: 0 });
  const logged = (dayMeals || []).filter((m) => (m.meal_id || m.id) !== mealId && (m.items || []).length);
  const used = logged.reduce((a, m) => { const t = tot(m.items); return { cal: a.cal + t.cal, p: a.p + t.p, c: a.c + t.c, f: a.f + t.f }; }, { cal: 0, p: 0, c: 0, f: 0 });
  const done = new Set(logged.map((m) => m.meal_id || m.id));
  const ids = (mealIds || []).includes(mealId) ? mealIds : [...(mealIds || []), mealId];
  const open = ids.filter((id) => !done.has(id) && MEAL_WEIGHTS[id] !== undefined);
  const wSum = open.reduce((s, id) => s + MEAL_WEIGHTS[id], 0) || 1;
  const share = (MEAL_WEIGHTS[mealId] || 0) / wSum;
  const remain = { cal: day.cal - used.cal, p: day.p - used.p, c: day.c - used.c, f: day.f - used.f };
  const fit = (k) => Math.round(Math.max(std[k] * min, Math.min(std[k] * max, Math.max(0, remain[k]) * share)) * 10) / 10;
  return { cal: Math.round(fit("cal")), p: fit("p"), c: fit("c"), f: fit("f"), std,
    remain: { cal: Math.round(remain.cal), p: Math.round(remain.p), c: Math.round(remain.c), f: Math.round(remain.f) },
    over: { f: remain.f < 0, c: remain.c < 0 } };
}

const macrosOf = (items) => (items || []).reduce((a, i) => ({ p: a.p + (Number(i.p ?? i.protein) || 0), c: a.c + (Number(i.c ?? i.carb) || 0), f: a.f + (Number(i.f ?? i.fat) || 0) }), { p: 0, c: 0, f: 0 });

/**
 * @returns [{ id, kind: "history"|"template"|"ai", title, date?, items, cal, target, dev }]
 */
export function mealSuggestions({ mealId, mealIds, macro, dayType, history = [], templates = [], aiMenus = [], avoidKeys = null, isAvoided = null, currentItems = [], limit = 5, dayMeals = null }) {
  // Có dữ liệu ngày → mục tiêu theo phần còn lại; không có → phần chuẩn của bữa
  const target = dayMeals ? remainingMealTarget({ macro, dayType, mealIds, mealId, dayMeals }) : mealTargetOf(macro, dayType, mealIds, mealId);
  const tCal = target?.cal || 0;
  const avoid = avoidKeys instanceof Set ? avoidKeys : new Set(avoidKeys || []);
  const banned = (items) => items.some((i) => avoid.has(keyOf(i)) || (isAvoided && (isAvoided(i.display || "") || isAvoided(i.food || i.name || ""))));
  const seen = new Set();
  const cur = valid(currentItems);
  if (cur.length) seen.add(sigOf(cur));
  const out = [];
  // Bữa cũ ghi 2 lần cùng 1 món ("Lạc rang, Lạc rang") → gộp thành 1 dòng, cộng gram + macro (16/10)
  const mergeSame = (items) => {
    const m = new Map();
    for (const it of items || []) {
      const k = String(it.food || it.display || it.name || "").toLowerCase().trim();
      if (!k) continue;
      const prev = m.get(k);
      if (!prev) { m.set(k, { ...it }); continue; }
      const add = (f) => (Number(prev[f]) || 0) + (Number(it[f]) || 0);
      const { qty_display, qty, ...rest } = prev;
      m.set(k, { ...rest, gram: add("gram"), cal: add("cal"), p: add("p"), c: add("c"), f: add("f"), fiber: add("fiber") });
    }
    return [...m.values()];
  };
  const push = (kind, title, items, extra = {}) => {
    const its = valid(mergeSame(items));
    if (!its.length || banned(its)) return;
    const sig = sigOf(its);
    if (seen.has(sig)) return;
    seen.add(sig);
    const cal = calOf(its);
    out.push({ id: `${kind}:${sig}`, kind, title, items: its, cal, ...macrosOf(its), target: tCal, dev: tCal ? (cal - tCal) / tCal : 0, ...extra });
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

  // Xếp: món vừa calo trước (lệch ≤ 15%); trong nhóm đó theo macro: thiếu đạm so với đạm của bữa bị trừ điểm,
  // béo vượt (nặng hơn khi béo cả ngày đã vượt) bị trừ điểm; món quen (đã ăn) nhỉnh hơn một chút.
  const tP = target?.p || 0, tF = target?.f || 0, fatOver = !!target?.over?.f;
  const macroScore = (s) => (tP ? 0.6 * Math.max(0, (tP - s.p) / tP) : 0) + (tF ? (fatOver ? 0.8 : 0.4) * Math.max(0, (s.f - tF) / tF) : 0);
  const rank = (s) => (Math.abs(s.dev) <= 0.15 ? 0 : 10) + macroScore(s) + 0.3 * Math.abs(s.dev) + (s.kind === "history" ? 0 : s.kind === "template" ? 0.05 : 0.1);
  const list = out.sort((a, b) => rank(a) - rank(b)).slice(0, limit);
  if (list[0] && Math.abs(list[0].dev) <= 0.15) list[0].best = true;
  return list;
}

// Chỉnh khẩu phần cả lựa chọn (Ít hơn / Vừa / Nhiều hơn): nhân đều gram, giữ đơn vị
export function scaleSuggestion(sug, k) {
  if (!sug || k === 1) return sug;
  const items = sug.items.map((it) => {
    const g = Math.max(5, Math.round(((Number(it.gram) || 0) * k) / 5) * 5);
    const { qty_display, ...rest } = scaleItem(it, g); // eslint-disable-line no-unused-vars
    return { ...rest, unit: it.unit, unit_g: it.unit_g, unit_mode: it.unit_mode };
  });
  const cal = calOf(items);
  return { ...sug, items, cal, ...macrosOf(items), dev: sug.target ? (cal - sug.target) / sug.target : 0 };
}
