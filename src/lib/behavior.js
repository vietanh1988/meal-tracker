// Quản trị PC › Hành vi khách (bản vẽ 135c–e, 18/10) — hàm thuần, có test (tests/behavior.test.mjs).
// users: từ RPC admin_behavior_users (id, username, email, created_at, ui_mode, onboarding_done, last_at, active_days_30, has_push)
// events: app_events trong khoảng xem ({ user_id, at, name, mode, meta, screen })
import { toVNDate, diffDays, addDays, weekRange, fmtVN } from "./dateVN.js";

export const vnDay = (iso) => (iso ? toVNDate(new Date(iso)) : null);
export const modeOf = (u) => (u && u.ui_mode === "loss" ? "loss" : "gym");
const MEAL = { sang: "Bữa sáng", phu_sang: "Phụ sáng", trua: "Bữa trưa", phu_chieu: "Phụ chiều", pre: "Trước tập", post: "Sau tập", toi: "Bữa tối" };
const HOW = { search: "tìm món", photo: "chụp ảnh", calc: "tính cả bữa", suggest: "gợi ý món", snack: "bữa phụ gợi ý" };

// Tên tính năng (hàng "Tính năng được dùng") — key: tên việc hoặc "tên:how"
export const FEATURES = [
  ["meal_eaten", "Đánh dấu Đã ăn"], ["menu_auto", "Thực đơn tự lên"], ["weigh", "Cân hôm nay"], ["water", "Uống nước"],
  ["swap", "Đổi món"], ["meal_log:photo", "Chụp ảnh tính calo"], ["meal_log:search", "Tìm món"], ["meal_log:suggest", "Gợi ý món"],
  ["meal_log:calc", "Tính calo cả bữa"], ["menu_tomorrow", "Xem thực đơn ngày mai"], ["activity", "Vận động thêm"], ["measure", "Đo vòng"],
  ["ai_chat", "Hỏi AI"], ["ai_menu", "AI lên thực đơn"],
];
const featKey = (e) => (e.name === "meal_log" ? `meal_log:${e.meta?.how || "search"}` : e.name);
const isMeal = (e) => e.name === "meal_eaten" || e.name === "meal_log";

// Dòng chữ cho dòng thời gian 1 khách
export function eventLabel(e) {
  const m = e.meta || {};
  switch (e.name) {
    case "app_open": return m.from === "push" ? "Mở app (từ thông báo)" : "Mở app";
    case "notif_click": return "Bấm vào thông báo";
    case "onb_step": return `Onboarding · ${ONB_STEP[m.step] || `bước ${m.step}`}`;
    case "onb_done": return m.mode === "loss" ? `Xong onboarding · Giảm cân${m.kg && m.kg !== "x" ? ` −${m.kg} kg` : ""}` : "Xong onboarding · Gym";
    case "meal_eaten": return `Đánh dấu Đã ăn · ${MEAL[m.meal] || "bữa"}`;
    case "meal_log": return `Ghi bữa · ${MEAL[m.meal] || "bữa"}${m.how ? ` (${HOW[m.how] || m.how})` : ""}`;
    case "menu_auto": return `${m.src === "week" ? "Áp Lịch tuần" : "Thực đơn tự lên"} · ${m.day === "tomorrow" ? "ngày mai" : "hôm nay"}`;
    case "menu_tomorrow": return "Mở Thực đơn › Ngày mai";
    case "swap": return `Đổi món · ${MEAL[m.meal] || "bữa"}`;
    case "avoid_save": return "Lưu món không ăn";
    case "weigh": return "Cân hôm nay";
    case "measure": return "Đo vòng";
    case "water": return "Uống nước";
    case "activity": return "Ghi vận động thêm";
    case "notif_on": return "Bật thông báo";
    case "notif_off": return "Tắt thông báo";
    case "ai_chat": return "Hỏi AI";
    case "ai_menu": return "Mở AI lên thực đơn";
    default: return e.name;
  }
}
export const ONB_STEP = { 0: "Màn chào · Bạn muốn gì?", 11: "Nhập cân nặng, chiều cao", 12: "Màn Kế hoạch", 1: "Gym · Cơ thể", 2: "Gym · Tập luyện", 3: "Gym · Mục tiêu" };

// Khoảng xem: days = 7 / 30 / null (từ đầu)
export const rangeStart = (today, days) => (days ? addDays(today, -(days - 1)) : null);

export function behaviorStats({ users = [], events = [], today, days = 7, mode = "all" }) {
  const from = rangeStart(today, days);
  const pick = (u) => mode === "all" || modeOf(u) === mode;
  const U = users.filter(pick);
  const ids = new Set(U.map((u) => u.id));
  const ev = events.filter((e) => ids.has(e.user_id)).map((e) => ({ ...e, day: vnDay(e.at) }));
  const inRange = ev.filter((e) => !from || e.day >= from);
  const byUser = new Map();
  ev.forEach((e) => { if (!byUser.has(e.user_id)) byUser.set(e.user_id, []); byUser.get(e.user_id).push(e); });
  const uniq = (list) => new Set(list.map((e) => e.user_id)).size;

  // 4 ô số
  const openToday = uniq(ev.filter((e) => e.day === today));
  const openRange = uniq(inRange);
  const mealEv = inRange.filter(isMeal);
  const newUsers = U.filter((u) => !from || vnDay(u.created_at) >= from);
  const tiles = {
    openToday, openRange,
    mealUsers: uniq(mealEv), mealCount: mealEv.length,
    newUsers: newUsers.length, newLoss: newUsers.filter((u) => modeOf(u) === "loss").length,
    push: U.filter((u) => u.has_push).length, total: U.length,
  };

  // Phễu: khách đăng ký trong khoảng xem
  const funnelUsers = newUsers;
  const hasAfter = (u, n) => (byUser.get(u.id) || []).some((e) => diffDays(vnDay(u.created_at), e.day) >= n);
  const steps = [
    ["Đăng ký", () => true],
    ["Xong onboarding", (u) => !!u.onboarding_done],
    ["Ghi bữa đầu tiên", (u) => (byUser.get(u.id) || []).some(isMeal)],
    ["Quay lại ngày 2", (u) => hasAfter(u, 1)],
    ["Còn dùng sau 7 ngày", (u) => hasAfter(u, 7)],
  ];
  let pool = funnelUsers;
  const funnel = steps.map(([label, ok]) => { pool = pool.filter(ok); return { label, n: pool.length }; });

  // Quay lại sau 1 / 7 / 14 ngày theo tuần đăng ký (4 tuần gần nhất)
  const cohorts = [];
  for (let w = 0; w < 4; w++) {
    const start = addDays(weekRange(today).start, -7 * w);
    const end = addDays(start, 6);
    const list = U.filter((u) => { const d = vnDay(u.created_at); return d >= start && d <= end; });
    if (!list.length) continue;
    const cell = (n) => {
      const ripe = list.filter((u) => diffDays(vnDay(u.created_at), today) >= n);
      return ripe.length ? Math.round((ripe.filter((u) => hasAfter(u, n)).length / ripe.length) * 100) : null;
    };
    cohorts.push({ label: `T2 ${fmtVN(start)}`, n: list.length, d1: cell(1), d7: cell(7), d14: cell(14) });
  }

  // Tính năng: số người dùng trong khoảng
  const featUsers = new Map();
  inRange.forEach((e) => { const k = featKey(e); if (!featUsers.has(k)) featUsers.set(k, new Set()); featUsers.get(k).add(e.user_id); });
  const features = FEATURES.map(([k, label]) => ({ key: k, label, n: featUsers.get(k)?.size || 0 })).sort((a, b) => b.n - a.n);

  // Bỏ ngang ở onboarding: khách chưa xong, bước cuối cùng thấy
  const drop = new Map();
  U.filter((u) => !u.onboarding_done).forEach((u) => {
    const steps2 = (byUser.get(u.id) || []).filter((e) => e.name === "onb_step").sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const s = steps2.length ? steps2[0].meta?.step : null;
    const label = s == null ? "Chưa có dữ liệu (trước khi ghi hành vi)" : ONB_STEP[s] || `Bước ${s}`;
    drop.set(label, (drop.get(label) || 0) + 1);
  });
  const onboardingDrop = [...drop.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);

  return { tiles, funnel, cohorts, features, onboardingDrop };
}

// "2 giờ trước", "hôm qua", "5 ngày trước"
export function agoText(iso, now = new Date()) {
  if (!iso) return "chưa có";
  const ms = now.getTime() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = diffDays(vnDay(iso), toVNDate(now));
  return d <= 1 ? "hôm qua" : `${d} ngày trước`;
}
// Ngắn cho chấm đỏ: "12 phút", "3 giờ", "2 ngày"
export function agoShort(iso, now = new Date()) {
  if (!iso) return null;
  const min = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `${Math.max(1, min)} phút`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} giờ` : `${Math.floor(h / 24)} ngày`;
}

// Tình trạng 1 khách: { tone, text }
export function userStatus(u, events = [], today) {
  const mine = events.filter((e) => e.user_id === u.id);
  if (!u.last_at) return u.onboarding_done ? { tone: "gray", text: "Chưa có dữ liệu" } : { tone: "red", text: "Bỏ ở onboarding" };
  const last = vnDay(u.last_at);
  const gap = diffDays(last, today);
  if (gap === 0) {
    const meals = new Set(mine.filter((e) => isMeal(e) && vnDay(e.at) === today).map((e) => e.meta?.meal || e.id)).size;
    return { tone: "green", text: meals ? `Ghi ${meals} bữa hôm nay` : "Có mở hôm nay" };
  }
  if (!u.onboarding_done) return { tone: "red", text: "Bỏ ở onboarding" };
  if (gap <= 2) return { tone: "amber", text: gap === 1 ? "Mở hôm qua" : "Mở 2 ngày trước" };
  if (gap <= 6) return { tone: "amber", text: "Thưa dần" };
  return { tone: "red", text: "Không quay lại" };
}

// Dòng thời gian 1 khách: [{ day, items: [{ time, label, screen }] }] mới nhất trước
export function timeline(events = [], userId) {
  const mine = events.filter((e) => e.user_id === userId).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const out = [];
  for (const e of mine) {
    const day = vnDay(e.at);
    if (!out.length || out[out.length - 1].day !== day) out.push({ day, items: [] });
    const t = new Date(e.at);
    const hh = String((t.getUTCHours() + 7) % 24).padStart(2, "0"), mm = String(t.getUTCMinutes()).padStart(2, "0");
    out[out.length - 1].items.push({ time: `${hh}:${mm}`, label: eventLabel(e), screen: e.screen || null, name: e.name });
  }
  return out;
}
