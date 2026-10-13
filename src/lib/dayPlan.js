// Giờ bữa + nước uống — hàm thuần, có test.
import { MEAL_ORDER, mealLabel } from "./mealMath.js";

export const DEFAULT_MEAL_TIMES = {
  sang: "07:00", phu_sang: "09:30", trua: "12:00", phu_chieu: "15:30",
  pre: "17:00", post: "18:30", toi: "19:30",
};

const toMin = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h < 24 && mi < 60 ? h * 60 + mi : null;
};

// Giờ của từng bữa (của user nếu hợp lệ, không thì mặc định)
export function mealTimesOf(profileTimes) {
  const out = { ...DEFAULT_MEAL_TIMES };
  if (profileTimes && typeof profileTimes === "object") {
    for (const k of Object.keys(out)) if (toMin(profileTimes[k]) != null) out[k] = profileTimes[k];
  }
  return out;
}

// Bữa "đang đến giờ": bữa hiển thị có giờ gần nhất ≤ bây giờ + 60 phút.
// Trước bữa đầu tiên → bữa đầu tiên. visibleIds: các bữa đang bật.
export function currentMealId(nowMinutes, visibleIds, profileTimes) {
  const times = mealTimesOf(profileTimes);
  const ids = MEAL_ORDER.filter(id => (visibleIds || MEAL_ORDER).includes(id))
    .sort((a, b) => toMin(times[a]) - toMin(times[b]));
  if (ids.length === 0) return null;
  let pick = ids[0];
  for (const id of ids) if (toMin(times[id]) <= nowMinutes + 60) pick = id;
  return pick;
}

// Bữa tiếp theo CHƯA ăn tính từ giờ hiện tại (cho thẻ "bữa sắp tới")
export function nextMealId(nowMinutes, visibleIds, eaten, profileTimes) {
  const times = mealTimesOf(profileTimes);
  const ids = MEAL_ORDER.filter(id => (visibleIds || MEAL_ORDER).includes(id) && !(eaten || []).includes(id))
    .sort((a, b) => toMin(times[a]) - toMin(times[b]));
  if (ids.length === 0) return null;
  // bữa đã qua giờ > 2 tiếng mà chưa ăn thì bỏ qua, ưu tiên bữa sắp tới
  return ids.find(id => toMin(times[id]) >= nowMinutes - 120) || ids[ids.length - 1];
}

// Mục tiêu nước: 35 ml/kg (+500 ml ngày tập), làm tròn 50 ml, kẹp 1.500–5.000.
// Người dùng tự đặt (overrideMl) thì dùng số đó.
export function waterGoalMl(kg, isTrainDay, overrideMl) {
  if (overrideMl && overrideMl >= 500 && overrideMl <= 8000) return Math.round(overrideMl);
  const w = Number(kg) || 60;
  const raw = 35 * w + (isTrainDay ? 500 : 0);
  return Math.min(5000, Math.max(1500, Math.round(raw / 50) * 50));
}

export const clampWater = (ml) => Math.min(10000, Math.max(0, Math.round(Number(ml) || 0)));

// Món hay ăn: đếm theo tên món trong các bữa ĐÃ ĂN, mới nhất trước khi bằng điểm.
// Trả [{key, item, count, lastDate}] — item là bản ghi gần nhất (giữ gram/macro).
export function frequentItems(dailyRows, limit = 12) {
  const map = new Map();
  for (const row of dailyRows || []) {
    const eaten = Array.isArray(row.eaten_meals) ? row.eaten_meals : [];
    for (const m of Array.isArray(row.meals) ? row.meals : []) {
      if (!eaten.includes(m.meal_id || m.id)) continue;
      for (const it of m.items || []) {
        const name = String(it.display || it.food || it.name || "").trim();
        if (!name) continue;
        const key = name.toLowerCase();
        const cur = map.get(key);
        if (!cur) map.set(key, { key, item: it, count: 1, lastDate: row.log_date });
        else {
          cur.count++;
          if (String(row.log_date) > String(cur.lastDate)) { cur.lastDate = row.log_date; cur.item = it; }
        }
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count || String(b.lastDate).localeCompare(String(a.lastDate)))
    .slice(0, limit);
}

// Bữa gần đây đã ăn (để "Ăn lại"): [{log_date, meal_id, meal_name, items, cal}]
export function recentEatenMeals(dailyRows, limit = 8) {
  const out = [];
  const rows = [...(dailyRows || [])].sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)));
  for (const row of rows) {
    const eaten = Array.isArray(row.eaten_meals) ? row.eaten_meals : [];
    for (const m of Array.isArray(row.meals) ? row.meals : []) {
      const id = m.meal_id || m.id;
      if (!eaten.includes(id) || !(m.items || []).length) continue;
      out.push({ log_date: row.log_date, meal_id: id, meal_name: mealLabel(m.meal_name, id), items: m.items,
        cal: Math.round((m.items || []).reduce((s, i) => s + (Number(i.cal) || 0), 0)) });
    }
  }
  return out.slice(0, limit);
}

// Nước theo cốc cho Hôm nay. cupMl: cỡ 1 cốc (mặc định 250).
// Trả { cupMl, total, filled, cups:[{i, full}], left } — total = số cốc để đủ mục tiêu,
// luôn có ít nhất 1 cốc trống để bấm uống thêm (khi đã vượt mục tiêu thì thêm cốc).
export const CUP_SIZES = [200, 250, 330, 500];
export function cupsView(waterMl, goalMl, cupMl = 250) {
  const cup = CUP_SIZES.includes(Number(cupMl)) ? Number(cupMl) : 250;
  const ml = Math.max(0, Math.round(Number(waterMl) || 0));
  const goal = Math.max(cup, Math.round(Number(goalMl) || 0));
  const need = Math.ceil(goal / cup);
  const filled = Math.floor(ml / cup);
  const total = Math.min(30, Math.max(need, filled + 1));
  const cups = Array.from({ length: total }, (_, k) => ({ i: k + 1, full: k < filled }));
  return { cupMl: cup, need, total, filled, cups, left: Math.max(0, need - filled), pct: Math.min(100, Math.round((ml / goal) * 100)), done: ml >= goal };
}
