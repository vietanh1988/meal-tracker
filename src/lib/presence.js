// "Đang dùng app" (bản vẽ 135e, 18/10): app của khách báo có mặt qua Supabase Realtime Presence (kênh fp-online),
// chỉ khi màn đang hiện; ẩn app / khoá màn → rút ngay. Không ghi DB. Quản trị PC nghe cùng kênh để tô chấm xanh / đỏ.
import { supabase } from "./supabase";

const CH = "fp-online";

export function joinPresence(uid) {
  if (!uid || typeof document === "undefined" || !supabase.channel) return () => {};
  let ch = null, ready = false;
  try { ch = supabase.channel(CH, { config: { presence: { key: uid } } }); } catch (e) { return () => {}; }
  const sync = () => {
    if (!ready) return;
    try { if (document.visibilityState === "visible") ch.track({ at: Date.now() }); else ch.untrack(); } catch (e) { /* */ }
  };
  try { ch.subscribe((st) => { if (st === "SUBSCRIBED") { ready = true; sync(); } }); } catch (e) { /* */ }
  document.addEventListener("visibilitychange", sync);
  return () => {
    document.removeEventListener("visibilitychange", sync);
    try { supabase.removeChannel(ch); } catch (e) { /* */ }
  };
}

// onChange(Set<userId>) mỗi khi danh sách người đang mở app đổi
export function watchPresence(onChange) {
  if (!supabase.channel) return () => {};
  let ch = null;
  try { ch = supabase.channel(CH); } catch (e) { return () => {}; }
  try {
    ch.on("presence", { event: "sync" }, () => { try { onChange(new Set(Object.keys(ch.presenceState() || {}))); } catch (e) { /* */ } });
    ch.subscribe();
  } catch (e) { /* */ }
  return () => { try { supabase.removeChannel(ch); } catch (e) { /* */ } };
}
