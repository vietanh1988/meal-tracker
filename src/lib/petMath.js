// Fipilot Pet — hàm thuần (có test tests/pet.test.mjs). Không đọc giờ máy: mọi "bây giờ" truyền vào (lấy từ src/lib/dateVN.js).
// Luật đã chốt 20/10 (BACKLOG-fipilot.md · Fipilot Pet). Điểm do MÁY CHỦ tính (hàm pet_claim); ở đây chỉ để hiển thị cho khớp.

// ---- Cấp: cấp 2 = 300 kinh nghiệm, mỗi cấp sau khoảng cách +150; sau cấp 10 mỗi cấp thêm 1.500 ----
export const LEVEL_XP = [0, 300, 750, 1350, 2100, 3000, 4050, 5250, 6600, 8100];
export function levelOf(xp) {
  const x = Math.max(0, Math.floor(Number(xp) || 0));
  let n = 1;
  while (n < LEVEL_XP.length && x >= LEVEL_XP[n]) n++;
  if (n === LEVEL_XP.length) { // trên cấp 10
    const extra = Math.floor((x - LEVEL_XP[9]) / 1500);
    n = 10 + extra;
    const from = LEVEL_XP[9] + extra * 1500;
    return { n, from, to: from + 1500 };
  }
  return { n, from: LEVEL_XP[n - 1], to: LEVEL_XP[n] };
}

export const DAILY_CAP = 120;
export const POINTS = { meal: 10, photo: 5, full_day: 20, water: 15, weigh: 20, streak: 10 };
export const MIN_MEAL_KCAL = 100;

// ---- Tâm trạng (máy tính, khách không chọn) ----
// minutes: phút trong ngày (giờ VN); mealTimes: phút giờ bữa đang bật (VD [420, 720, 1140]);
// logged: số bữa đã ghi đã ăn hôm nay; daysAway: số ngày liền trước hôm nay không ghi gì.
export function moodOf({ minutes, mealTimes = [], logged = 0, daysAway = 0 }) {
  if (daysAway >= 2 && logged === 0) return "mung";
  if (minutes >= 22 * 60 + 30) return "ngu";
  const times = [...mealTimes].sort((a, b) => a - b);
  if (logged === 0 && (times.length === 0 || minutes < times[0] + 60)) return "ngu";
  const due = times.filter((t) => minutes >= t + 60).length;
  if (logged < due) return "hoi";
  return "vui";
}

// ---- Việc Pi nói (khen / nhắc) — key khớp src/pet/lines.js ----
// s: { minutes, logged, mealsOn, mealTimes, daysAway, streak, levelUp, level, waterMl, waterGoal, weekDownKg, gymDay }
export const STREAK_MARKS = [3, 7, 14, 30, 60, 100];
export function eventsFor(s) {
  const ev = [];
  const m = s.minutes ?? 0;
  if ((s.daysAway || 0) >= 2) ev.push({ key: "back" });
  if (s.levelUp) ev.push({ key: "level", so: s.level });
  if (STREAK_MARKS.includes(s.streak)) ev.push({ key: "streak", so: s.streak });
  if (s.mealsOn > 0 && s.logged >= s.mealsOn) ev.push({ key: "full" });
  if (s.weekDownKg > 0) ev.push({ key: "weight" });
  const due = (s.mealTimes || []).filter((t) => m >= t + 60).length;
  if (s.logged < due && m < 22 * 60 + 30) ev.push({ key: "meal_late" });
  const glasses = Math.ceil(Math.max(0, (s.waterGoal || 0) - (s.waterMl || 0)) / 250);
  if (m >= 15 * 60 && glasses >= 2) ev.push({ key: "water", so: glasses });
  if (m < 11 * 60) ev.push({ key: s.gymDay ? "gym" : "rest" });
  if (m >= 22 * 60 + 30) ev.push({ key: "night" });
  return ev;
}

// Chọn câu nói lúc này: ưu tiên số nhỏ trước; mỗi việc không lặp trong `gapH` giờ; đủ `perDay` câu thì im; giờ yên lặng thì im.
// said: { [key]: epochMs lần nói gần nhất }; saidToday: số câu đã nói hôm nay; quiet: [phút bắt đầu, phút kết thúc] (qua nửa đêm được)
export function pickEvent(events, { prio = {}, said = {}, nowMs = 0, saidToday = 0, perDay = 3, gapH = 24, minutes = 0, quiet = [22 * 60 + 30, 7 * 60], off = [] } = {}) {
  const [qa, qb] = quiet;
  const inQuiet = qa > qb ? minutes >= qa || minutes < qb : minutes >= qa && minutes < qb;
  if (saidToday >= perDay) return null;
  const ok = events.filter((e) => !off.includes(e.key) && !(said[e.key] && nowMs - said[e.key] < gapH * 3600e3) && (!inQuiet || e.key === "night"));
  ok.sort((a, b) => (prio[a.key] ?? 99) - (prio[b.key] ?? 99));
  return ok[0] || null;
}

// ---- Tuần (thứ Hai – Chủ nhật) ----
export function weekStart(dateStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const t = Date.UTC(y, mo - 1, d);
  const wd = (new Date(t).getUTCDay() + 6) % 7; // 0 = thứ Hai
  return new Date(t - wd * 864e5).toISOString().slice(0, 10);
}

// ---- Cửa hàng ----
export function itemStatus(it, { owned = [], level = 1, premium = false, variant = "nam" } = {}) {
  if (!it.variants.includes(variant)) return "other";
  if (owned.includes(it.id)) return "owned";
  if (it.achievement) return "achievement";
  if (it.level > level) return "level";
  if (it.rarity !== "common" && !premium) return "premium";
  return "buy";
}

// ---- Phòng theo dịp (20/10): Noel 15/12–31/12; Tết từ 10 ngày trước đến 7 ngày sau mùng 1 Tết âm lịch ----
// Ngày mùng 1 Tết (dương lịch) — bảng cố định, thêm năm mới khi cần.
export const TET_DAYS = ["2027-02-06", "2028-01-26", "2029-02-13", "2030-02-03", "2031-01-23", "2032-02-11", "2033-01-31", "2034-02-19", "2035-02-08", "2036-01-28"];
// Rằm tháng 8 âm lịch (Trung thu, dương lịch) — bảng cố định
export const TRUNG_THU_DAYS = ["2027-09-15", "2028-10-03", "2029-09-22", "2030-09-12", "2031-10-01", "2032-09-19", "2033-09-08", "2034-09-27", "2035-09-16", "2036-10-04"];
const LUNAR = { tet: () => TET_DAYS, "trung-thu": () => TRUNG_THU_DAYS };
const dayNum = (s) => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000);
/** dateStr "YYYY-MM-DD" (giờ VN) → "noel" | "tet" | "halloween" | null — Halloween 20/10–31/10 */
export function seasonOf(dateStr) {
  if (!dateStr || dateStr.length < 10) return null;
  const md = dateStr.slice(5, 10);
  if (md >= "12-15" && md <= "12-31") return "noel";
  if (md >= "10-20" && md <= "10-31") return "halloween";
  const d = dayNum(dateStr);
  for (const t of TET_DAYS) { const k = d - dayNum(t); if (k >= -10 && k <= 7) return "tet"; }
  for (const t of TRUNG_THU_DAYS) { const k = d - dayNum(t); if (k >= -10 && k <= 2) return "trung-thu"; }
  return null;
}

// ---- Bộ sưu tập theo dịp (20/10, chủ dự án: chưa đến dịp thì khoá) ----
// Quản trị › Thú cưng Pi › Bộ sưu tập lưu ở pet_config.collections; hàm SQL public.pet_col_open dùng cùng luật (mua trên máy chủ).
// mode: "season" (mở theo dịp) | "open" (luôn mở) | "closed" (đóng). Noel: from / to dạng "MM-DD" (qua năm được, VD 12-01 → 01-06).
// Tết: before / after = số ngày trước / sau mùng 1 Tết (TET_DAYS).
export const COL_DEFAULT = {
  noel: { mode: "season", from: "12-01", to: "01-06" },
  tet: { mode: "season", before: 21, after: 15 },
  "co-trang": { mode: "open" },
  halloween: { mode: "season", from: "10-15", to: "11-02" },
  // Bóng đá: theo mùa giải → mặc định ĐÓNG, admin bật "Luôn mở" hoặc đặt ngày khi có giải; đang bán thì phòng Pi đổi sang phòng bóng đá
  "bong-da": { mode: "closed", from: "11-15", to: "01-10" },
  "trung-thu": { mode: "season", before: 21, after: 3 },
  // 23/10: bộ Pi mới (Muse AI) thêm Mùa đông / Mùa hè
  "mua-dong": { mode: "season", from: "12-01", to: "02-28" },
  "mua-he": { mode: "season", from: "05-01", to: "08-31" },
};
const fmtDM = (s) => `${+s.slice(8, 10)}/${+s.slice(5, 7)}`;
const shift = (s, n) => new Date((dayNum(s) + n) * 86400000).toISOString().slice(0, 10);
/** → { open, label } — label: "Mở bán 1/12 – 6/1" (đang mở: "Bán tới 6/1") để hiện trên Cửa hàng */
export function collectionStatus(col, cfg = {}, dateStr) {
  const c = { ...(COL_DEFAULT[col] || { mode: "open" }), ...((cfg.collections || {})[col] || {}) };
  if (c.mode === "open") return { open: true, label: "" };
  if (c.mode === "closed") return { open: false, label: "Tạm đóng" };
  if (!dateStr) return { open: false, label: "" };
  if (LUNAR[col]) {
    const d = dayNum(dateStr);
    const before = Number(c.before ?? COL_DEFAULT[col].before), after = Number(c.after ?? COL_DEFAULT[col].after);
    for (const t of LUNAR[col]()) {
      const k = d - dayNum(t);
      if (k >= -before && k <= after) return { open: true, label: `Bán tới ${fmtDM(shift(t, after))}` };
      if (k < -before) return { open: false, label: `Mở bán ${fmtDM(shift(t, -before))} – ${fmtDM(shift(t, after))}` };
    }
    return { open: false, label: "Chưa có lịch" };
  }
  const md = dateStr.slice(5, 10), from = c.from || "01-01", to = c.to || "12-31"; // mặc định từng bộ ở COL_DEFAULT, khớp SQL pet_col_open
  const open = from <= to ? md >= from && md <= to : md >= from || md <= to;

  const dm = (m) => `${+m.slice(3, 5)}/${+m.slice(0, 2)}`;
  if (open) return { open: true, label: `Bán tới ${dm(to)}` };
  return { open: false, label: `Mở bán ${dm(from)} – ${dm(to)}` };
}

// Tuần ISO dạng "2026-W43" — khớp to_char(day, 'IYYY-"W"IW') của máy chủ (khoá Hạt cân tuần)
export function isoWeek(dateStr) {
  const d = new Date(Date.UTC(+dateStr.slice(0, 4), +dateStr.slice(5, 7) - 1, +dateStr.slice(8, 10)));
  const wd = (d.getUTCDay() + 6) % 7; // 0 = T2
  d.setUTCDate(d.getUTCDate() - wd + 3); // thứ Năm cùng tuần
  const y = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const w = 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}
