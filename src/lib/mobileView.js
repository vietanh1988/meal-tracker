// Tính toán cho giao diện mobile mới (Hôm nay / Ghi bữa / Sửa bữa / Tiến độ).
// Hàm THUẦN, không gọi DB — có test ở tests/mobile-view.test.mjs.
import { MEAL_ORDER, MEAL_NAMES, mealKey, sumItems, eatenTotals, hasItems, mealLabel } from "./mealMath.js";
import { mealTimesOf } from "./dayPlan.js";
import { addDays, weekRange, weekdayOf, isGymDate, diffDays, fmtVN } from "./dateVN.js";
import { LOCAL_FOODS, UNIT_MAP, lookupLocalFood, getFoodDisplay } from "./localFoodDB.js";

// Nhãn thứ trên dải ngày (bản vẽ: Hai Ba Tư Năm Sáu Bảy CN)
const WD_STRIP = ["CN", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy"];
export const weekdayStrip = (s) => WD_STRIP[weekdayOf(s)];
const WD_FULL = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
export const weekdayFull = (s) => WD_FULL[weekdayOf(s)];

// Tên ngắn trên chip bữa (Ghi bữa)
export const MEAL_SHORT = {
  sang: "Sáng", phu_sang: "Phụ sáng", trua: "Trưa", phu_chieu: "Phụ chiều",
  pre: "Trước tập", post: "Sau tập", toi: "Tối",
};
// Tên trên dòng thời gian Hôm nay (bản vẽ: "Phụ chiều", không "Bữa phụ chiều")
export const MEAL_TL_NAME = {
  sang: "Bữa sáng", phu_sang: "Phụ sáng", trua: "Bữa trưa", phu_chieu: "Phụ chiều",
  pre: "Trước tập", post: "Sau tập", toi: "Bữa tối",
};
// Icon PNG từng bữa (public/icons)
export const MEAL_ICON = {
  sang: "/icons/meal_morning.png", phu_sang: "/icons/meal_snack.png", trua: "/icons/meal_lunch.png",
  phu_chieu: "/icons/meal_snack.png", pre: "/icons/meal_preworkout.png", post: "/icons/meal_preworkout.png",
  toi: "/icons/meal_dinner.png",
};
// Khung giờ hiển thị trên thẻ "đến giờ ăn" (Trưa có khung 10:30–14:00)
const MEAL_WINDOW = { trua: ["10:30", "14:00"] };

export const toMin = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

// Loại ngày của 1 ngày bất kỳ: theo lịch tập (gymDays 0=T2…6=CN), "none" = luôn nghỉ
export function dayTypeOf(profile, date) {
  if ((profile?.exerciseType || "gym") === "none") return "rest";
  return isGymDate(profile?.gymDays || [0, 2, 4, 5], date) ? "train" : "rest";
}

// Mục tiêu theo loại ngày
export function targetsOf(macro, dayType) {
  const train = dayType !== "rest";
  return {
    cal: Math.round(train ? macro.calTarget : macro.calRest) || 0,
    p: Math.round(macro.protein) || 0,
    c: Math.round(train ? macro.carb : macro.carbRest) || 0,
    f: Math.round(macro.fat) || 0,
    fiber: Math.round(macro.fiber) || 0,
  };
}

// Bữa đang bật cho loại ngày (mealConfig của user → app → mặc định), bỏ pre/post khi không tập
export function visibleMealIds(mealConfig, dayType, exerciseType, fallback) {
  let ids = (mealConfig && mealConfig[dayType]) || (fallback && fallback[dayType]) || ["sang", "trua", "toi"];
  if ((exerciseType || "gym") === "none") ids = ids.filter((id) => id !== "pre" && id !== "post");
  return MEAL_ORDER.filter((id) => ids.includes(id));
}

// Bữa đã có món trong ngày nhưng đang tắt vẫn phải hiện (không giấu dữ liệu user)
export function timelineIds(day, visibleIds) {
  const logged = (day?.meals || []).filter(hasItems).map(mealKey);
  return MEAL_ORDER.filter((id) => visibleIds.includes(id) || logged.includes(id));
}

// Trạng thái từng bữa trong ngày, sắp theo giờ
//  state: "eaten" (đã tick) | "planned" (có món, chưa tick) | "missed" (trống, đã qua giờ > 60') | "empty"
export function mealRows(day, ids, profileTimes, nowMinutes, isToday, isPast) {
  const times = mealTimesOf(profileTimes);
  const byId = {};
  (day?.meals || []).forEach((m) => { byId[mealKey(m)] = m; });
  const eaten = new Set(day?.eaten_meals || []);
  return ids
    .map((id) => {
      const m = byId[id];
      const items = (m && m.items) || [];
      const tot = sumItems(items);
      const has = items.length > 0;
      const t = toMin(times[id]);
      let state = "empty";
      if (has) state = eaten.has(id) ? "eaten" : "planned";
      else if (isPast || (isToday && t != null && nowMinutes > t + 60)) state = "missed";
      return {
        id, name: (() => { const l = m ? mealLabel(m.meal_name, id) : ""; return (l && l !== MEAL_NAMES[id] ? l : MEAL_TL_NAME[id]) || id; })(), time: times[id], minutes: t,
        items, cal: Math.round(tot.cal), state,
      };
    })
    .sort((a, b) => (a.minutes ?? 0) - (b.minutes ?? 0));
}

// Bữa cho thẻ "đến giờ ăn": bữa có giờ gần nhất ≤ bây giờ + 60' mà CHƯA ăn;
// đã ăn rồi thì lấy bữa chưa ăn kế tiếp; tất cả đã ăn → null.
export function focusMeal(rows, nowMinutes) {
  const open = rows.filter((r) => r.state !== "eaten");
  if (open.length === 0) return null;
  let pick = null;
  for (const r of rows) if ((r.minutes ?? 0) <= nowMinutes + 60) pick = r;
  if (pick && pick.state !== "eaten") return pick;
  return open.find((r) => (r.minutes ?? 0) >= nowMinutes - 60) || open[open.length - 1];
}

export function mealWindowLabel(id, time) {
  const w = MEAL_WINDOW[id];
  return w ? `${w[0]} – ${w[1]}` : time;
}

// Tổng đã ăn của 1 ngày (chỉ bữa đã tick)
export function eatenOfDay(day) {
  const t = eatenTotals(day?.meals || [], day?.eaten_meals || []);
  return { cal: Math.round(t.cal), p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f), fiber: Math.round(t.fiber) };
}

// Đánh giá 1 ngày cho biểu đồ Tiến độ
//  status: "ok" (90–110%) | "low" (<90%) | "high" (>110%) | "planned" (có món, chưa tick) | "none"
export function dayStatus(day, targetCal) {
  const meals = (day?.meals || []).filter(hasItems);
  const eatenIds = new Set(day?.eaten_meals || []);
  const eatenCount = meals.filter((m) => eatenIds.has(mealKey(m))).length;
  const cal = eatenOfDay(day).cal;
  const planCal = Math.round(meals.reduce((s, m) => s + sumItems(m.items).cal, 0));
  let status = "none";
  if (eatenCount > 0) {
    const r = targetCal > 0 ? cal / targetCal : 0;
    status = r < 0.9 ? "low" : r > 1.1 ? "high" : "ok";
  } else if (meals.length > 0) status = "planned";
  return { cal, planCal, mealCount: meals.length, eatenCount, pct: targetCal > 0 ? Math.round((cal / targetCal) * 100) : 0, status };
}

// Tổng kết 1 khoảng ngày cho Tiến độ – Ăn uống
// rows: daily_logs; targetOf(date) → kcal mục tiêu ngày đó
export function rangeSummary(rows, dates, targetOf) {
  const byDate = {};
  (rows || []).forEach((r) => { byDate[String(r.log_date).slice(0, 10)] = r; });
  const days = dates.map((d) => {
    const target = targetOf(d);
    return { date: d, target, ...dayStatus(byDate[d], target) };
  });
  const logged = days.filter((d) => d.eatenCount > 0);
  const avg = logged.length ? Math.round(logged.reduce((s, d) => s + d.cal, 0) / logged.length) : 0;
  return { days, avg, okCount: logged.filter((d) => d.status === "ok").length, loggedCount: logged.length };
}

export function weekDates(date) {
  const { start } = weekRange(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// ===== Tìm món (kho món trong app + món đã duyệt trong food_cache) =====
export const stripVN = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").trim();

let _index = null;
function localIndex() {
  if (!_index) _index = Object.keys(LOCAL_FOODS).map((k) => ({ key: k, plain: stripVN(k) }));
  return _index;
}

// Khẩu phần mặc định: đơn vị đầu tiên trong UNIT_MAP, không có thì 100 g
export function defaultPortion(key) {
  const u = UNIT_MAP[key];
  if (u && u.length) return { gram: u[0].gram, label: u[0].name };
  return { gram: 100, label: null };
}

// Món (định dạng items trong daily_logs) từ kho món trong app
export function itemFromLocal(key, gram, label) {
  const r = lookupLocalFood(key, gram);
  if (!r) return null;
  return {
    food: key, display: getFoodDisplay(key), gram: r.gram, unit: "g",
    ...(label ? { qty_display: label } : {}),
    p: r.protein, c: r.carb, f: r.fat, fiber: r.fiber, cal: r.cal, source: "localDB",
  };
}

// Món từ food_cache (macro theo `gram` của bản ghi)
export function itemFromCache(name, v) {
  const g = Number(v.gram) || 100;
  return { food: name, display: getFoodDisplay(name), gram: g, unit: "g", p: v.p || 0, c: v.c || 0, f: v.f || 0, fiber: v.fiber || 0, cal: Math.round(v.cal || 0), source: "cache" };
}

// Kết quả tìm: khớp đầu chuỗi trước, rồi khớp từ, rồi chứa; không dấu vẫn tìm được
export function searchFoods(query, foodCache, limit = 20) {
  const q = stripVN(query);
  if (q.length < 1) return [];
  // Khớp theo từ (16/10): "thịt gà xào" không có nguyên cụm vẫn ra "gà xào sả ớt" — đủ mọi từ (4) hoặc thiếu 1 từ khi gõ ≥ 3 từ (5)
  const words = q.split(/\s+/).filter((w) => w.length >= 2);
  const byWords = (plain) => {
    if (words.length < 2) return 9;
    const pw = ` ${plain} `;
    const hit = words.filter((w) => pw.includes(` ${w} `)).length;
    return hit === words.length ? 4 : words.length >= 3 && hit >= words.length - 1 ? 5 : 9;
  };
  const score = (plain) => (plain === q ? 0 : plain.startsWith(q) ? 1 : plain.includes(" " + q) ? 2 : plain.includes(q) ? 3 : byWords(plain));
  const seen = new Set();
  const out = [];
  for (const { key, plain } of localIndex()) {
    const s = score(plain);
    if (s < 9) { out.push({ key, s, len: key.length, src: "local" }); seen.add(key); }
  }
  for (const name of Object.keys(foodCache || {})) {
    if (seen.has(name)) continue;
    const s = score(stripVN(name));
    if (s < 9) out.push({ key: name, s: s + 0.5, len: name.length, src: "cache" });
  }
  out.sort((a, b) => a.s - b.s || a.len - b.len || a.key.localeCompare(b.key, "vi"));
  const items = out.slice(0, limit * 2).map(({ key, src }) => {
    if (src === "local") {
      const p = defaultPortion(key);
      return itemFromLocal(key, p.gram, p.label);
    }
    return itemFromCache(key, foodCache[key]);
  }).filter(Boolean);
  return dedupeByName(items).slice(0, limit);
}

// Trùng tên hiển thị (16/10): kho có nhiều mã cùng hiện 1 tên ("thịt lợn"/"thịt lợn nạc" → "Thịt lợn luộc",
// "ức gà luộc"/"gà luộc" → "Gà luộc"). Món trùng cả tên lẫn calo/100 g → bỏ bớt; khác calo → hiện tên gốc của mã cho khỏi nhầm.
export function dedupeByName(items) {
  const per100 = (it) => Math.round(((Number(it.cal) || 0) / (Number(it.gram) || 100)) * 100);
  const cap = (x) => { const r = String(x || ""); return r.charAt(0).toUpperCase() + r.slice(1); };
  const out = [];
  const names = new Map(); // tên → món đã giữ
  for (const it of items) {
    const n = stripVN(itemName(it));
    const prev = names.get(n);
    if (!prev) { names.set(n, it); out.push(it); continue; }
    if (Math.abs(per100(prev) - per100(it)) <= 3) continue; // cùng món, khác mã
    const own = cap(it.food);
    if (names.has(stripVN(own))) continue;
    // món giữ trước mà không đúng mã tên hiển thị thì cũng đổi về tên mã của nó
    if (stripVN(prev.food || "") !== n) { const pn = cap(prev.food); prev.display = pn; names.set(stripVN(pn), prev); names.delete(n); }
    const copy = { ...it, display: own };
    names.set(stripVN(own), copy);
    out.push(copy);
  }
  return out;
}

// Đổi gram 1 món: macro nhân theo tỉ lệ gram mới / gram cũ
export function scaleItem(item, newGram) {
  const g = Math.max(0, Math.round(Number(newGram) || 0));
  const old = Number(item.gram) || 0;
  if (!old || old === g) return { ...item, gram: g };
  const r = g / old;
  const r1 = (x) => Math.round((Number(x) || 0) * r * 10) / 10;
  const { qty_display, ...rest } = item;
  return {
    ...rest, gram: g,
    p: r1(item.p ?? item.protein), c: r1(item.c ?? item.carb), f: r1(item.f ?? item.fat), fiber: r1(item.fiber),
    cal: Math.round((Number(item.cal) || 0) * r),
  };
}

export const itemName = (it) => String(it?.display || it?.food || it?.name || "Món").trim();
export function itemPortion(it) {
  if (it?.qty_display) return it.qty_display;
  const g = Math.round(Number(it?.gram) || 0);
  return g ? `${g} g` : "";
}

// ===== Cân nặng =====
// weightLog: [{id, week, date, logged_date, kg, delta}] tăng dần theo ngày
export function weightSummary(weightLog, goalKg, profileKg, today) {
  const log = weightLog || [];
  const first = log[0];
  const last = log[log.length - 1];
  const startKg = first ? first.kg : profileKg;
  const curKg = last ? last.kg : profileKg;
  const span = goalKg - startKg;
  const pct = span !== 0 ? Math.max(0, Math.min(100, Math.round(((curKg - startKg) / span) * 100))) : (curKg === goalKg ? 100 : 0);
  const days = first && last ? diffDays(first.logged_date, last.logged_date) : 0;
  const weeks = days / 7;
  const change = Math.round((curKg - startKg) * 10) / 10;
  const perWeek = weeks >= 1 ? Math.round((change / weeks) * 10) / 10 : null;
  const sinceLast = last ? diffDays(last.logged_date, today) : null;
  return {
    startKg, curKg, goalKg, pct, change, weeks: Math.round(weeks * 10) / 10, perWeek,
    startDate: first ? fmtVN(first.logged_date) : null, sinceLast, weighedToday: sinceLast === 0,
  };
}

// Delta tốt hay xấu theo hướng mục tiêu (tăng cân: + là tốt)
export function deltaGood(delta, goalKg, startKg) {
  if (!delta) return null;
  const up = goalKg >= startKg;
  return up ? delta > 0 : delta < 0;
}

// Số kiểu VN: 2391 → "2.391"; 2.75 → "2,75"
export const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString("vi-VN");
export const fmtDec = (n, d = 1) => (Number(n) || 0).toLocaleString("vi-VN", { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const fmtKg = (n) => (Number(n) || 0).toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Thẻ "Tuần này" ở Hôm nay: 7 cột kcal đã ăn so với mục tiêu từng ngày.
// rows: daily_logs của tuần (T2→CN); todayLog thay cho dòng hôm nay (mới nhất).
// Ngày "đạt" = đã ăn trong ±10% mục tiêu. Chỉ tính các ngày đã qua + hôm nay có ăn.
export function weekCard(rows, todayLog, dates, today, targetOf) {
  const byDate = {};
  (rows || []).forEach((r) => { byDate[String(r.log_date).slice(0, 10)] = r; });
  if (todayLog && todayLog.log_date === today) byDate[today] = todayLog;
  const days = dates.map((d) => {
    const target = targetOf(d);
    const s = dayStatus(byDate[d], target);
    const kind = d > today ? "future" : d === today ? "today" : "past";
    return { date: d, target, cal: s.cal, ratio: target > 0 ? s.cal / target : 0, ok: s.status === "ok", kind, has: s.eatenCount > 0 };
  });
  const counted = days.filter((x) => x.has && x.kind !== "future");
  const avg = counted.length ? Math.round(counted.reduce((a, x) => a + x.cal, 0) / counted.length) : 0;
  return { days, okDays: counted.filter((x) => x.ok).length, countedDays: counted.length, avg };
}

// Biểu đồ cân nặng (Tiến độ › Cân nặng): lọc theo khoảng (4 tuần / 8 tuần / tất cả), chuẩn hoá toạ độ 0..1,
// trục y có khoảng đệm và luôn chứa vạch mục tiêu. eta = số tuần còn lại theo tốc độ hiện tại (null nếu sai hướng/chưa đủ dữ liệu).
export function weightChart(log, goalKg, range, today, perWeek = null, curKg = null) {
  const days = range === "4w" ? 28 : range === "8w" ? 56 : null;
  const from = days ? addDays(today, -days) : null;
  const pts = (log || []).filter((r) => r && r.logged_date && (!from || r.logged_date >= from)).map((r) => ({ date: r.logged_date, kg: Number(r.kg) }));
  if (!pts.length) return { points: [], goalY: null, ticks: [], eta: null };
  const first = from && pts[0].date > from ? from : pts[0].date;
  const last = today > pts[pts.length - 1].date ? today : pts[pts.length - 1].date;
  const span = Math.max(1, diffDays(first, last));
  const vals = pts.map((p) => p.kg).concat(Number(goalKg) || []);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max(0.3, (hi - lo) * 0.15);
  lo = Math.floor((lo - pad) * 2) / 2; hi = Math.ceil((hi + pad) * 2) / 2;
  const y = (kg) => (hi - kg) / (hi - lo || 1);
  const points = pts.map((p) => ({ ...p, x: diffDays(first, p.date) / span, y: y(p.kg) }));
  const step = (hi - lo) / 3;
  const ticks = [0, 1, 2, 3].map((i) => Math.round((lo + step * i) * 10) / 10);
  const left = goalKg != null && curKg != null ? goalKg - curKg : null;
  const eta = left != null && perWeek && Math.sign(perWeek) === Math.sign(left) && Math.abs(left) >= 0.1 ? Math.ceil(Math.round(Math.abs(left / perWeek) * 100) / 100) : null;
  return { points, goalY: goalKg ? y(Number(goalKg)) : null, lo, hi, ticks: ticks.map((v) => ({ v, y: y(v) })), first, last, eta };
}

// Trạng thái thanh macro ở header Hôm nay (16/10): "over" khi vượt >110% mục tiêu; "under" khi thiếu <90%
// nhưng CHỈ khi ngày đã xong (ngày cũ hoặc đã ăn hết các bữa) — trong ngày đang ăn dở không báo thiếu.
export function macroState(eaten, target, dayDone) {
  if (!(target > 0)) return "ok";
  if (eaten > target * 1.1) return "over";
  if (dayDone && eaten < target * 0.9) return "under";
  return "ok";
}
