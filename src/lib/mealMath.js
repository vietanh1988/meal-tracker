// ============================================================
// Tính toán bữa ăn / nhật ký ngày — hàm THUẦN (không gọi DB), có test.
// Một ngày (daily_logs) = { meals: [{meal_id, meal_name, items, ...}], eaten_meals: [meal_id] }
// ============================================================

// Thứ tự khung bữa chuẩn trong ngày
export const MEAL_ORDER = ["sang", "phu_sang", "trua", "phu_chieu", "pre", "post", "toi"];
export const MEAL_NAMES = {
  sang: "Bữa sáng", phu_sang: "Bữa phụ sáng", trua: "Bữa trưa", phu_chieu: "Bữa phụ chiều",
  pre: "Trước tập", post: "Sau tập", toi: "Bữa tối",
};

const num = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string" && /^\s*-?\d+(\.\d+)?\s*$/.test(v)) return parseFloat(v);
  return 0;
};

export const mealKey = (m) => (m && (m.meal_id || m.id)) || "";

// Tên bữa chuẩn để hiển thị/lưu. Dữ liệu cũ có meal_name = mã bữa ("trua", "phu_chieu")
// hoặc kèm emoji ("🌙 Bữa tối") → đổi về tên tiếng Việt có dấu.
export function mealLabel(rawName, id) {
  const name = String(rawName || "").replace(/^[^\p{L}]+/u, "").trim();
  if (!name || name === id || /^[a-z_]+$/.test(name) || MEAL_ORDER.includes(name)) return MEAL_NAMES[id] || name || id;
  return name;
}

// Macro của 1 món — chấp nhận cả p/c/f và protein/carb/fat
export function itemMacros(i) {
  if (!i) return { cal: 0, p: 0, c: 0, f: 0, fiber: 0 };
  return {
    cal: num(i.cal),
    p: num(i.p) || num(i.protein),
    c: num(i.c) || num(i.carb),
    f: num(i.f) || num(i.fat),
    fiber: num(i.fiber),
  };
}

const zero = () => ({ cal: 0, p: 0, c: 0, f: 0, fiber: 0 });
const add = (a, b) => ({ cal: a.cal + b.cal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f, fiber: a.fiber + b.fiber });

export function sumItems(items) {
  return (Array.isArray(items) ? items : []).reduce((a, i) => add(a, itemMacros(i)), zero());
}

export function sumMeals(meals) {
  return (Array.isArray(meals) ? meals : []).reduce((a, m) => add(a, sumItems(m && m.items)), zero());
}

// Làm tròn để lưu DB / hiển thị
export function roundTotals(t) {
  const r1 = (x) => Math.round(x * 10) / 10;
  return { cal: Math.round(t.cal), p: r1(t.p), c: r1(t.c), f: r1(t.f), fiber: r1(t.fiber) };
}

// Tổng CHỈ các bữa đã tick "đã ăn"
export function eatenTotals(meals, eaten) {
  const set = new Set(Array.isArray(eaten) ? eaten : []);
  return sumMeals((meals || []).filter((m) => set.has(mealKey(m))));
}

export const hasItems = (m) => !!(m && Array.isArray(m.items) && m.items.length > 0);

export function sortMeals(meals) {
  const idx = (k) => { const i = MEAL_ORDER.indexOf(k); return i < 0 ? 99 : i; };
  return [...(meals || [])].sort((a, b) => idx(mealKey(a)) - idx(mealKey(b)));
}

const uniq = (arr) => [...new Set(arr)];

// Ghi 1 bữa vào ngày: thay bữa cùng meal_id; items rỗng = xoá bữa (và bỏ tick).
// opts.markEaten: tick luôn (ghi bữa đã ăn từ ảnh / nhập tay).
// Bữa đã tick trước đó mà sửa lại món → vẫn giữ tick.
export function setMeal(day, mealId, items, opts = {}) {
  const meals = (day && Array.isArray(day.meals) ? day.meals : []).filter((m) => mealKey(m) !== mealId);
  const prevEaten = (day && Array.isArray(day.eaten_meals) ? day.eaten_meals : []);
  const wasEaten = prevEaten.includes(mealId);
  let eaten = prevEaten.filter((e) => e !== mealId);
  const has = Array.isArray(items) && items.length > 0;
  if (has) {
    meals.push({
      ...(opts.extra || {}),
      meal_id: mealId,
      meal_name: mealLabel(opts.name, mealId),
      items,
    });
    if (opts.markEaten || wasEaten) eaten.push(mealId);
  }
  return { ...(day || {}), meals: sortMeals(meals), eaten_meals: uniq(eaten) };
}

// Tick / bỏ tick — chỉ tick được bữa đang có món
export function toggleEatenIn(day, mealId, isEaten) {
  const prev = (day && Array.isArray(day.eaten_meals) ? day.eaten_meals : []).filter((e) => e !== mealId);
  const exists = (day?.meals || []).some((m) => mealKey(m) === mealId && hasItems(m));
  return { ...(day || {}), eaten_meals: isEaten && exists ? [...prev, mealId] : prev };
}

// Áp thực đơn cả ngày (template / AI): bữa ĐÃ ĂN giữ nguyên, bữa khác thay mới.
export function applyMenu(day, menuMeals, dayType) {
  const eaten = (day && Array.isArray(day.eaten_meals) ? day.eaten_meals : []);
  const fresh = (menuMeals || [])
    .filter((m) => mealKey(m) && hasItems(m) && !eaten.includes(mealKey(m)))
    .map((m) => ({ ...m, meal_id: mealKey(m), meal_name: mealLabel(m.meal_name || m.name, mealKey(m)) }));
  const freshIds = new Set(fresh.map(mealKey));
  // Giữ: bữa đã ăn + bữa đã có món mà thực đơn mới KHÔNG có (không xoá ngầm bữa user tự ghi)
  const keep = (day?.meals || []).filter((m) => eaten.includes(mealKey(m)) || (hasItems(m) && !freshIds.has(mealKey(m))));
  return {
    ...(day || {}),
    day_type: dayType === "train" || dayType === "rest" ? dayType : (day?.day_type || "train"),
    meals: sortMeals([...keep, ...fresh]),
    eaten_meals: eaten.filter((e) => keep.some((m) => mealKey(m) === e)),
  };
}

// Payload ghi daily_logs từ 1 ngày
export function dayRowPayload(userId, logDate, day) {
  const t = roundTotals(sumMeals(day.meals));
  return {
    user_id: userId,
    log_date: logDate,
    day_type: day.day_type === "rest" ? "rest" : "train",
    meals: day.meals || [],
    eaten_meals: day.eaten_meals || [],
    total_cal: t.cal, total_protein: t.p, total_carb: t.c, total_fat: t.f, total_fiber: t.fiber,
    is_complete: (day.eaten_meals || []).length >= 3,
    water_ml: Math.min(10000, Math.max(0, Math.round(Number(day.water_ml) || 0))),
  };
}

// Điền món của ngày vào khung bữa chuẩn (cho UI dạng danh sách 7 khung)
export function toSlots(day, baseSlots) {
  const byId = {};
  (day?.meals || []).forEach((m) => { byId[mealKey(m)] = m; });
  return baseSlots.map((s) => {
    const m = byId[s.id];
    if (!m) return { ...s, items: [] };
    return { ...s, items: m.items || [], ...(m.pattern ? { pattern: m.pattern } : {}), ...(m.composite !== undefined ? { composite: !!m.composite } : {}) };
  });
}
