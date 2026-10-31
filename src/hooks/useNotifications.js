// Thông báo trong app (dùng cho chuông + màn Thông báo mobile):
//  - "Hoạt động của bạn": bảng notifications (đơn hàng duyệt, admin trả lời góp ý…), đồng bộ Realtime có thử lại
//  - "Cập nhật ứng dụng": app_settings.notifications (admin đăng), chỉ hiện tin từ ngày user tạo tài khoản
// Đã xem: notifications.is_read (DB) + id tin cập nhật lưu trong localStorage.
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";

const ACK_KEY = "fipilot_seen_update_ids";
const readSeen = () => { try { return JSON.parse(localStorage.getItem(ACK_KEY) || "[]") || []; } catch (e) { return []; } };

function playDing() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.setValueAtTime(1320, ctx.currentTime + 0.09);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.35);
  } catch (e) { /* không có âm thanh cũng được */ }
}

// "dd/mm/yyyy" → so với ngày tạo tài khoản ("YYYY-MM-DD…")
export function updatesSince(all, createdAt) {
  const list = Array.isArray(all) ? all : [];
  if (!createdAt) return list;
  const c = String(createdAt).slice(0, 10);
  return list.filter((n) => {
    const p = String(n?.date || "").split("/");
    if (p.length < 3) return true;
    const iso = `${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`;
    return iso >= c;
  });
}

export function useNotifications(appSettings, userId) {
  const [items, setItems] = useState([]);
  const [createdAt, setCreatedAt] = useState(null);
  const [seen, setSeen] = useState(readSeen);
  const [ringing, setRinging] = useState(false);
  const [toast, setToast] = useState(null); // 31/10: thông báo nổi khi đang mở app (tin mới nhất qua Realtime)
  const ringTimer = useRef(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    supabase.from("profiles").select("created_at").eq("id", userId).maybeSingle().then(({ data }) => { if (alive && data?.created_at) setCreatedAt(data.created_at); });
    supabase.from("notifications").select("id,title,body,url,is_read,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30)
      .then(({ data, error }) => { if (error) console.error("[notifications] load error:", error); else if (alive && data) setItems(data); });
    return () => { alive = false; };
  }, [userId]);

  // Realtime: thử lại 2s→4s→…→30s (tối đa 5 lần); tab mở lại mà kênh chết thì nối lại ngay
  useEffect(() => {
    if (!userId) return;
    let channel = null, retry = 0, timer = null, disposed = false, dead = false;
    const subscribe = () => {
      if (disposed) return;
      if (channel) { try { supabase.removeChannel(channel); } catch (e) { /* */ } }
      dead = false;
      channel = supabase.channel(`notifications-${userId}-${Date.now()}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
          setItems((prev) => [payload.new, ...prev].slice(0, 30));
          setToast(payload.new);
          setRinging(true); playDing();
          clearTimeout(ringTimer.current);
          ringTimer.current = setTimeout(() => setRinging(false), 2000);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") { retry = 0; dead = false; return; }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            dead = true;
            if (disposed || retry >= 5) return;
            const delay = Math.min(2000 * 2 ** retry, 30000);
            retry++;
            clearTimeout(timer);
            timer = setTimeout(subscribe, delay);
          }
        });
    };
    const onVisible = () => { if (document.visibilityState === "visible" && dead && !disposed) { retry = 0; subscribe(); } };
    subscribe();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true; clearTimeout(timer); clearTimeout(ringTimer.current);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) { try { supabase.removeChannel(channel); } catch (e) { /* */ } }
    };
  }, [userId]);

  let all = [];
  try { all = appSettings?.notifications ? JSON.parse(appSettings.notifications) : []; } catch (e) { all = []; }
  const updates = updatesSince(all, createdAt);
  const unread = items.filter((n) => !n.is_read).length + updates.filter((n) => n.isNew && !seen.includes(n.id)).length;

  const markAllRead = useCallback(async () => {
    const ids = items.filter((n) => !n.is_read).map((n) => n.id);
    if (ids.length) {
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      try { await supabase.from("notifications").update({ is_read: true }).in("id", ids); } catch (e) { console.error("[notifications] mark read error:", e); }
    }
    const newIds = updates.filter((n) => n.isNew).map((n) => n.id);
    if (newIds.some((id) => !seen.includes(id))) {
      const merged = Array.from(new Set([...seen, ...newIds]));
      setSeen(merged);
      try { localStorage.setItem(ACK_KEY, JSON.stringify(merged)); } catch (e) { /* */ }
    }
  }, [items, updates, seen]);

  // đánh dấu 1 tin đã đọc (trả lời lời mời ngay ở thông báo nổi)
  const markRead = useCallback(async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try { await supabase.from("notifications").update({ is_read: true }).eq("id", id); } catch (e) { /* */ }
  }, []);

  return { items, updates, unread, ringing, markAllRead, markRead, toast, clearToast: () => setToast(null) };
}
