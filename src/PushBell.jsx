import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { C } from "./theme";

// Phát 1 tiếng "ding" ngắn bằng Web Audio — không cần file âm thanh
function playDing() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.setValueAtTime(1320, ctx.currentTime + 0.09);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}

// Chuông báo push THỜI GIAN THỰC (đơn hàng duyệt, v.v.) — LƯU VÀO DB (bảng `notifications`),
// đồng bộ qua Supabase Realtime nên dùng được trên mọi thiết bị (PC + Mobile), không mất
// khi tải lại trang. Khác với NotiBell (báo "có bản cập nhật app mới").
export function PushBell({ userId, dark }) {
  const [items, setItems] = useState([]);
  const [show, setShow] = useState(false);
  const [ringing, setRinging] = useState(false);
  const ref = useRef(null);
  const ringTimeoutRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,body,url,is_read,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error && data) setItems(data);
    })();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setItems((prev) => [payload.new, ...prev].slice(0, 20));
          setRinging(true);
          playDing();
          if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
          ringTimeoutRef.current = setTimeout(() => setRinging(false), 2000);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    if (!show) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [show]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const openList = async () => {
    setShow((s) => !s);
    const unreadIds = items.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      try { await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds); } catch (e) { console.error("mark read error:", e); }
    }
  };

  const fmtTime = (ts) => {
    try { return new Date(ts).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }); } catch (e) { return ""; }
  };

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <style>{`@keyframes pushBellRing{0%,100%{transform:rotate(0)}20%{transform:rotate(18deg)}40%{transform:rotate(-16deg)}60%{transform:rotate(10deg)}80%{transform:rotate(-6deg)}}@keyframes pushBellGlow{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}30%,70%{box-shadow:0 0 0 6px rgba(239,68,68,0.25)}}`}</style>
      <div
        onClick={openList}
        style={{
          width: dark ? 36 : 40, height: dark ? 36 : 40, borderRadius: "50%",
          background: dark ? "rgba(255,255,255,0.1)" : C.card,
          border: dark ? "1px solid rgba(255,255,255,0.2)" : `1.5px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: dark ? 16 : 18, cursor: "pointer",
          boxShadow: dark ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
          animation: ringing ? "pushBellRing 0.6s ease-in-out 0s 2, pushBellGlow 2s ease-in-out" : "none",
        }}
      >
        🔔
      </div>
      {unreadCount > 0 && (
        <div style={{ position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, background: "#EF4444", border: dark ? "2px solid #111" : "2px solid #fff", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
          {unreadCount > 9 ? "9+" : unreadCount}
        </div>
      )}
      {show && (
        <div style={{ position: "absolute", top: dark ? 44 : 48, right: 0, width: "min(320px, calc(100vw - 28px))", background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 50, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: `1.5px solid ${C.border}`, fontSize: 13, fontWeight: 700, color: C.t1 }}>🔔 Hoạt động của bạn</div>
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {items.map((n) => (
              <div key={n.id} onClick={() => { if (n.url) window.location.href = n.url; }} style={{ padding: "10px 14px", cursor: n.url ? "pointer" : "default", borderBottom: `0.5px solid ${C.border}`, background: !n.is_read ? "rgba(220,38,38,0.04)" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {!n.is_read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", flexShrink: 0 }} />}
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, lineHeight: 1.4 }}>{n.title}</div>
                </div>
                {n.body && <div style={{ fontSize: 11, color: C.t2, marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>}
                <div style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>{fmtTime(n.created_at)}</div>
              </div>
            ))}
            {items.length === 0 && <div style={{ padding: "16px", textAlign: "center", fontSize: 12, color: C.t3 }}>Chưa có thông báo nào</div>}
          </div>
        </div>
      )}
    </div>
  );
}
