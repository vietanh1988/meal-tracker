// Cài đặt nhắc nhở (profiles.reminder_settings) — hàm thuần, dùng chung cho app và hàm gửi nhắc phía server.
// Dạng lưu:
// {
//   meal:  { on: true,  slots: [{ meal: "trua", time: "11:45" }, …] },   // chỉ nhắc khi bữa đó chưa ghi
//   weigh: { on: true,  weekday: 0, time: "07:00" },                       // weekday 0 = T2 … 6 = CN (như gymDays)
//   water: { on: false, every: 2, from: "08:00", to: "20:00" }             // mỗi `every` giờ trong khung
// }
// Server: edge function push-meal-reminder (type "tick", cron mỗi phút) gọi dueReminders theo giờ VN.
// Không import file khác: file này được chép nguyên sang supabase/functions/push-meal-reminder/ (test kiểm tra 2 bản giống nhau)
const MEAL_ORDER = ["sang", "phu_sang", "trua", "phu_chieu", "pre", "post", "toi"];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const WEEKDAY_NAMES = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"];
export const WATER_EVERY = [1, 2, 3];

export const DEFAULT_REMINDERS = {
  meal: { on: true, slots: [{ meal: "trua", time: "11:45" }, { meal: "toi", time: "19:30" }] },
  weigh: { on: true, weekday: 0, time: "07:00" },
  water: { on: false, every: 2, from: "08:00", to: "20:00" },
};

const t = (v, d) => (typeof v === "string" && HHMM.test(v) ? v : d);
export const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const fromMin = (n) => { const x = ((n % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };

// Làm sạch dữ liệu cũ/sai: thiếu → mặc định, giờ sai → mặc định, bữa trùng → giữ 1, sắp theo giờ
export function normalizeReminders(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const D = DEFAULT_REMINDERS;
  const m = r.meal || {};
  const seen = new Set();
  const slots = (Array.isArray(m.slots) ? m.slots : D.meal.slots)
    .filter((s) => s && MEAL_ORDER.includes(s.meal) && HHMM.test(s.time || "") && !seen.has(s.meal) && seen.add(s.meal))
    .map((s) => ({ meal: s.meal, time: s.time }))
    .sort((a, b) => toMin(a.time) - toMin(b.time));
  const w = r.weigh || {};
  const wa = r.water || {};
  let from = t(wa.from, D.water.from), to = t(wa.to, D.water.to);
  if (toMin(to) <= toMin(from)) { from = D.water.from; to = D.water.to; }
  return {
    meal: { on: m.on !== undefined ? !!m.on : D.meal.on, slots },
    weigh: { on: w.on !== undefined ? !!w.on : D.weigh.on, weekday: Number.isInteger(w.weekday) && w.weekday >= 0 && w.weekday <= 6 ? w.weekday : D.weigh.weekday, time: t(w.time, D.weigh.time) },
    water: { on: !!wa.on, every: WATER_EVERY.includes(wa.every) ? wa.every : D.water.every, from, to },
  };
}

// Giờ nhắc mặc định cho 1 bữa: 15 phút sau giờ ăn của bữa đó
export const defaultSlotTime = (mealTime) => fromMin(toMin(t(mealTime, "12:00")) + 15);

// Các mốc nhắc uống nước trong ngày, ví dụ every 2, 08:00–20:00 → 08:00, 10:00, … 20:00
export function waterTimes(water) {
  const w = normalizeReminders({ water: { ...water, on: true } }).water;
  const out = [];
  for (let x = toMin(w.from); x <= toMin(w.to); x += w.every * 60) out.push(fromMin(x));
  return out;
}

// Những nhắc cần gửi ở phút `hhmm` (giờ VN) của ngày có thứ `weekday` (0 = T2).
// loggedMeals: các bữa đã ghi hôm nay (bữa đã ghi thì không nhắc).
export function dueReminders(raw, { hhmm, weekday, loggedMeals = [] }) {
  const r = normalizeReminders(raw);
  const out = [];
  if (r.meal.on) r.meal.slots.forEach((s) => { if (s.time === hhmm && !loggedMeals.includes(s.meal)) out.push({ type: "meal", meal: s.meal }); });
  if (r.weigh.on && r.weigh.weekday === weekday && r.weigh.time === hhmm) out.push({ type: "weigh" });
  if (r.water.on && waterTimes(r.water).includes(hhmm)) out.push({ type: "water" });
  return out;
}
