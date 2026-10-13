// ============================================================
// Ngày giờ theo giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7, không DST).
// MỌI chỗ cần "hôm nay", "thứ mấy", "tuần này" phải đi qua file này —
// KHÔNG dùng new Date().toISOString().slice(0,10) (đó là ngày UTC, trước
// 7h sáng VN sẽ ra NGÀY HÔM QUA) và KHÔNG dùng getDay() của máy (máy người
// dùng có thể đặt múi giờ khác).
// Chuỗi ngày luôn ở dạng "YYYY-MM-DD".
// ============================================================

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

// Date bất kỳ → "YYYY-MM-DD" theo giờ VN
export function toVNDate(d = new Date()) {
  const t = (d instanceof Date ? d.getTime() : new Date(d).getTime()) + VN_OFFSET_MS;
  return new Date(t).toISOString().slice(0, 10);
}

export const todayVN = () => toVNDate(new Date());

// Giờ hiện tại theo VN (0–23) và phút trong ngày
export function nowVNParts(d = new Date()) {
  const v = new Date(d.getTime() + VN_OFFSET_MS);
  return { hour: v.getUTCHours(), minute: v.getUTCMinutes(), minutes: v.getUTCHours() * 60 + v.getUTCMinutes() };
}

// "YYYY-MM-DD" → Date tại 00:00 UTC (chỉ để tính toán ngày, không hiển thị giờ)
function parse(s) {
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
const fmt = (dt) => dt.toISOString().slice(0, 10);

export function isValidDateStr(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return fmt(parse(s)) === s;
}

export function addDays(s, n) {
  const dt = parse(s);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fmt(dt);
}

// 0 = Chủ nhật … 6 = Thứ bảy (giống Date.getDay, nhưng theo ngày VN)
export function weekdayOf(s) { return parse(s).getUTCDay(); }
export const weekdayVN = () => weekdayOf(todayVN());

// Số ngày giữa 2 chuỗi ngày (b - a)
export function diffDays(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }

// Tuần Thứ 2 → Chủ nhật chứa ngày s
export function weekRange(s = todayVN()) {
  const wd = weekdayOf(s);
  const start = addDays(s, wd === 0 ? -6 : 1 - wd);
  return { start, end: addDays(start, 6) };
}

export function monthRange(s = todayVN()) {
  const [y, m] = s.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const end = fmt(new Date(Date.UTC(y, m, 0)));
  return { start, end };
}

// n ngày gần nhất tính cả hôm nay
export function lastNDays(n, s = todayVN()) {
  return { start: addDays(s, -(n - 1)), end: s };
}

// Danh sách ngày từ start → end (bao gồm 2 đầu)
export function dateList(start, end) {
  const out = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

const DAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DAY_LONG = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
export const weekdayShort = (s) => DAY_SHORT[weekdayOf(s)];
export const weekdayLong = (s) => DAY_LONG[weekdayOf(s)];

// "2026-10-13" → "13/10" hoặc "13/10/2026"
export function fmtVN(s, withYear = false) {
  if (!s) return "";
  const [y, m, d] = s.slice(0, 10).split("-");
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}

// Nhãn thân thiện: Hôm nay / Hôm qua / T3 13/10
export function friendlyDate(s, today = todayVN()) {
  if (s === today) return "Hôm nay";
  if (s === addDays(today, -1)) return "Hôm qua";
  if (s === addDays(today, 1)) return "Ngày mai";
  return `${weekdayShort(s)} ${fmtVN(s)}`;
}

// Key ngày trong tuần dùng cho weekly_templates.day_name
const TPL_KEYS = ["cn", "thu_2", "thu_3", "thu_4", "thu_5", "thu_6", "thu_7"];
export const templateKeyOf = (s) => TPL_KEYS[weekdayOf(s)];

// profile.gymDays dùng chỉ số 0 = Thứ 2 … 6 = Chủ nhật
export const gymIdxOf = (s) => (weekdayOf(s) + 6) % 7;
export const isGymDate = (gymDays, s = todayVN()) => (gymDays || []).includes(gymIdxOf(s));
