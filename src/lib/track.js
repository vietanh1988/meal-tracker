// Ghi hành vi khách (18/10, bản vẽ 135c–e) → bảng app_events. Chỉ ghi "đã làm gì", KHÔNG ghi tên món / số cân / dữ liệu sức khoẻ.
// Gom 1,5 s rồi ghi 1 lần; app ẩn (khoá màn, chuyển app) thì ghi ngay. Lỗi (mất mạng, chưa có bảng) → bỏ qua, không làm phiền khách.
// Admin không bị ghi (đỡ lẫn số liệu khi chủ dự án tự test).
import { supabase } from "./supabase";
import { todayVN } from "./dateVN";

let ctx = { uid: null, mode: null, off: false };
let queue = [];
let timer = null;

export function setTrackUser(uid, mode = null, isAdmin = false) {
  let force = false;
  try { force = localStorage.getItem("fp_track_admin") === "1"; } catch (e) { /* */ } // bài test E2E (tài khoản test là admin)
  ctx = { uid: uid || null, mode: mode === "loss" || mode === "gym" ? mode : null, off: !!isAdmin && !force };
}

export async function flushTrack() {
  clearTimeout(timer); timer = null;
  if (!queue.length) return;
  const rows = queue.splice(0, 50);
  try { await supabase.from("app_events").insert(rows); } catch (e) { /* bỏ qua */ }
  if (queue.length) timer = setTimeout(flushTrack, 500);
}

const clean = (meta) => {
  if (!meta || typeof meta !== "object") return null;
  const out = {};
  for (const [k, v] of Object.entries(meta)) if (v != null && v !== "" && (typeof v !== "string" || v.length <= 40)) out[k] = v;
  return Object.keys(out).length ? out : null;
};

export function track(name, meta = null, screen = null) {
  if (!ctx.uid || ctx.off || !name) return;
  queue.push({ user_id: ctx.uid, name: String(name).slice(0, 40), screen: screen ? String(screen).slice(0, 30) : null, mode: ctx.mode, meta: clean(meta) });
  if (!timer) timer = setTimeout(flushTrack, 1500);
}

// Việc bấm nhiều lần trong ngày (mở app, uống nước…) → chỉ ghi 1 lần / ngày / tài khoản
export function trackDaily(name, meta = null, screen = null) {
  if (!ctx.uid || ctx.off) return;
  const k = `fp_ev:${ctx.uid}:${name}`;
  const d = todayVN();
  try { if (localStorage.getItem(k) === d) return; localStorage.setItem(k, d); } catch (e) { /* vẫn ghi */ }
  track(name, meta, screen);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushTrack(); });
}
