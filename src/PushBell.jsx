import { useState, useEffect, useRef } from "react";
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

// Chuông báo push THỜI GIAN THỰC (đơn hàng duyệt, v.v.)
// Khác với NotiBell (báo "có bản cập nhật app mới").
// Danh sách chỉ lưu trong phiên hiện tại (mất khi tải lại trang) — Service Worker
// vẫn đẩy popup hệ điều hành như bình thường song song, đây chỉ là lớp báo thêm
// trong lúc app đang mở, không phụ thuộc quyền thông báo của trình duyệt/OS.
export function PushBell({ dark }) {
  const [items, setItems] = useState([]);
  const [show, setShow] = useState(false);
  const [ringing, setRinging] = useState(false);
  const ref = useRef(null);
  const ringTimeoutRef = useRef(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event) => {
      const data = event.data;
      if (!data || data.type !== "fipilot-push") return;
      setItems((prev) =>
        [
          { id: Date.now() + Math.random(), title: data.title || "FipilotAI", body: data.body || "", url: data.url || "/", isNew: true, ts: data.ts || Date.now() },
          ...prev,
        ].slice(0, 20)
      );
      setRinging(true);
      playDing();
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = setTimeout(() => setRinging(false), 2000);
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    if (!show) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [show]);

  const unreadCount = items.filter((n) => n.isNew).length;

  const openList = () => {
    setShow((s) => !s);
    setItems((prev) => prev.map((n) => ({ ...n, isNew: false })));
  };

  const fmtTime = (ts) => {
    try { return new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
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
        <div style={{ position: "absolute", top: dark ? 44 : 48, right: 0, width: 320, background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 50, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: `1.5px solid ${C.border}`, fontSize: 13, fontWeight: 700, color: C.t1 }}>🔔 Hoạt động của bạn</div>
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {items.map((n) => (
              <div key={n.id} onClick={() => { if (n.url) window.location.href = n.url; }} style={{ padding: "10px 14px", cursor: n.url ? "pointer" : "default", borderBottom: `0.5px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, lineHeight: 1.4 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 11, color: C.t2, marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>}
                <div style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>{fmtTime(n.ts)}</div>
              </div>
            ))}
            {items.length === 0 && <div style={{ padding: "16px", textAlign: "center", fontSize: 12, color: C.t3 }}>Chưa có thông báo nào</div>}
          </div>
        </div>
      )}
    </div>
  );
}
