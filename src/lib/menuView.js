// Logic thuần cho tab Thực đơn (mobile): Lịch tuần, Kho mẫu, mục tiêu theo loại ngày. Có test.
import { MEAL_ORDER, mealLabel } from "./mealMath.js";
import { templateKeyOf } from "./dateVN.js";

// Lịch tuần lưu theo khoá T2 … CN (weekly_templates.day_name); chỉ số 0 = T2 như profile.gymDays
export const WEEK_KEYS = ["thu_2", "thu_3", "thu_4", "thu_5", "thu_6", "thu_7", "cn"];
export const WEEK_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
export const WEEK_LONG = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"];
export const GOAL_KEY = { bulk: "tang_co", cut: "giam_mo", maintain: "duy_tri" };

export const mealsCal = (meals) => Math.round((meals || []).reduce((s, m) => (m.items || []).reduce((a, i) => a + (Number(i.cal) || 0), s), 0));
export const hasMeals = (tpl) => !!(tpl && (tpl.meals || []).some((m) => (m.items || []).length > 0));

// Mục tiêu ngày cho Meal Engine (gram theo đúng macro của user)
export function dailyTargetOf(macro, dayType) {
  const train = dayType !== "rest";
  return {
    cal: train ? macro?.calTarget || 0 : macro?.calRest || macro?.calTarget || 0,
    p: macro?.protein || 0,
    c: train ? macro?.carb || 0 : macro?.carbRest || macro?.carb || 0,
    f: macro?.fat || 0,
  };
}

// 7 dòng Lịch tuần
export function weekRows({ getTemplate, gymDays, exerciseType, macro, today }) {
  const none = (exerciseType || "gym") === "none";
  const todayKey = today ? templateKeyOf(today) : null;
  return WEEK_KEYS.map((key, i) => {
    const tpl = getTemplate ? getTemplate(key) : null;
    const dayType = none ? "rest" : (gymDays || []).includes(i) ? "train" : "rest";
    const meals = ((tpl && tpl.meals) || []).filter((m) => (m.items || []).length > 0)
      .sort((a, b) => MEAL_ORDER.indexOf(a.meal_id) - MEAL_ORDER.indexOf(b.meal_id));
    const cal = meals.length ? (Number(tpl.total_cal) || mealsCal(meals)) : 0;
    const target = dailyTargetOf(macro, dayType).cal;
    return {
      key, idx: i, short: WEEK_SHORT[i], long: WEEK_LONG[i], dayType, isToday: key === todayKey,
      tpl: meals.length ? tpl : null, meals, cal,
      names: meals.map((m) => mealLabel(m.meal_name, m.meal_id)),
      low: meals.length > 0 && target > 0 && cal < target * 0.7,
      mismatch: !!(tpl && meals.length && tpl.day_type && tpl.day_type !== dayType),
    };
  });
}

// Kho mẫu admin hợp mục tiêu (+ kiểu ăn khi giảm mỡ) và loại ngày
export function libraryFor(templates, { goal, dietStrategy, dayType }) {
  const g = GOAL_KEY[goal] || "duy_tri";
  const diet = dietStrategy === "low_carb" || dietStrategy === "keto" ? dietStrategy : "balance";
  return (templates || []).filter((t) => t && t.goal_type === g && (!dayType || t.day_type === dayType) && (g !== "giam_mo" || (t.diet_strategy || "balance") === diet));
}

export const bundlesFor = (bundles, goal) => (bundles || []).filter((b) => b && b.goal_type === (GOAL_KEY[goal] || "duy_tri"));

// Thực đơn hôm nay → dạng lưu Lịch tuần (chỉ bữa có món)
export function dayToTemplateMeals(day) {
  return ((day && day.meals) || []).filter((m) => (m.items || []).length > 0).map((m) => ({
    meal_id: m.meal_id || m.id, meal_name: mealLabel(m.meal_name, m.meal_id || m.id), items: m.items,
    ...(m.pattern ? { pattern: m.pattern } : {}), ...(m.composite !== undefined ? { composite: !!m.composite } : {}),
  }));
}

// Ngày đã ăn trước đây để dùng lại ("Thực đơn của tôi"): bỏ hôm nay, cần ≥2 bữa đã ăn,
// mới nhất trước, bỏ ngày trùng y hệt món (cùng danh sách tên món). Trả {date, meals, cal, eatenCount}.
export function pastDaysFor(rows, today, n = 5) {
  const out = [];
  const seen = new Set();
  const sorted = [...(rows || [])].sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)));
  for (const r of sorted) {
    const d = String(r.log_date).slice(0, 10);
    if (d >= today) continue;
    const eaten = new Set(r.eaten_meals || []);
    const meals = dayToTemplateMeals({ meals: (r.meals || []).filter((m) => eaten.has(m.meal_id || m.id)) })
      .sort((a, b) => MEAL_ORDER.indexOf(a.meal_id) - MEAL_ORDER.indexOf(b.meal_id));
    if (meals.length < 2) continue;
    const sig = meals.map((m) => m.items.map((i) => i.food || i.name).join("+")).join("|");
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({ date: d, day_type: r.day_type === "rest" ? "rest" : "train", meals, cal: mealsCal(meals), eatenCount: meals.length });
    if (out.length >= n) break;
  }
  return out;
}
