// 31/10 (chủ dự án chốt bản vẽ "Thả tim người lạ, xin kết bạn, thông báo" khung 3): đang mở app mà có thông báo mới (Realtime, bảng notifications)
// → thẻ nổi trượt xuống từ trên. Lề 10, bo 18, bóng 0 12 30 / 25%, pad 12, khe 10; ô icon 40 bo 13; tiêu đề 14/800, phụ 12.5 #64748B.
// Tự ẩn sau 4 giây (lời mời 8 giây), vuốt lên để tắt, chạm để mở Bạn bè & Xếp hạng. Lời mời có nút Xem / Đồng ý (h34 bo 10).
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import { notifKind, answeredFields } from "../lib/notifKind";
import { FONT, GRAD_BLUE } from "./ui";

const S = (d, s = 22) => <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const HEART = (s) => <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24"><path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z" /></svg>;
// màu ô icon theo loại: [nền sáng, chữ sáng, nền tối, chữ tối]
export const KIND_STYLE = {
  heart: ["#FFE4E6", "#E11D48", "rgba(244,63,94,0.18)", "#FDA4AF"],
  req: ["#EEF4FF", "#0062F0", "rgba(96,165,250,0.18)", "#93C5FD"],
  friend: ["#DCFCE7", "#15803D", "rgba(74,222,155,0.18)", "#86EFAC"],
  note: ["#FEF3C7", "#B45309", "rgba(251,191,36,0.18)", "#FCD34D"],
  social: ["#EEF4FF", "#0062F0", "rgba(96,165,250,0.18)", "#93C5FD"],
  other: ["#EEF4FF", "#0062F0", "rgba(96,165,250,0.18)", "#93C5FD"],
};
export function KindIcon({ kind, size = 22 }) {
  if (kind === "heart") return HEART(size);
  if (kind === "req") return S(<><circle cx="9" cy="8" r="4" /><path d="M2 20c1-4 4-6 7-6s6 2 7 6M18 8v6M15 11h6" /></>, size);
  if (kind === "friend") return S(<path d="M5 12.5l4.5 4.5L19 7.5" />, size);
  if (kind === "note") return S(<path d="M4 5h16v11H9l-5 4z" />, size);
  return S(<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>, size);
}

export function NotifToast({ notif, onOpen }) {
  const n = notif.toast;
  const [done, setDone] = useState(null); // "ok" sau khi Đồng ý
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  const y0 = useRef(null);
  const k = n ? notifKind(n) : null;
  useEffect(() => {
    setDone(null);
    if (!n) return undefined;
    const t = setTimeout(() => notif.clearToast(), k?.kind === "req" ? 8000 : 4000);
    return () => clearTimeout(t);
  }, [n?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!n || typeof document === "undefined") return null;
  const [bg, fg] = KIND_STYLE[k.kind] || KIND_STYLE.other;
  const open = () => { notif.markRead(n.id); notif.clearToast(); onOpen?.(n.url); };
  const accept = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("pi_friend_answer", { p_nick: k.nick, p_accept: true });
    setBusy(false);
    if (!error) { setDone("ok"); notif.markRead(n.id); notif.patch?.(n.id, answeredFields(n, k.nick, true)); setTimeout(() => notif.clearToast(), 1500); }
  };
  const onStart = (e) => { y0.current = e.touches[0].clientY; };
  const onMove = (e) => { if (y0.current == null || !box.current) return; const dy = Math.min(0, e.touches[0].clientY - y0.current); box.current.style.transform = `translateY(${dy}px)`; };
  const onEnd = (e) => {
    if (y0.current == null) return;
    const dy = (e.changedTouches?.[0]?.clientY ?? y0.current) - y0.current; y0.current = null;
    if (dy < -30) notif.clearToast(); else if (box.current) box.current.style.transform = "";
  };
  return createPortal(
    <div ref={box} data-testid="notif-toast" data-kind={k.kind} role="status" onClick={open} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
      style={{ position: "fixed", left: 10, right: 10, top: "calc(env(safe-area-inset-top, 0px) + 8px)", maxWidth: 540, margin: "0 auto", zIndex: 170, background: "#FFFFFF", borderRadius: 18,
        boxShadow: "0 12px 30px rgba(15,23,42,0.25)", padding: 12, display: "flex", alignItems: "center", gap: 10, fontFamily: FONT, color: "#0F172A", animation: "fpmToastIn .25s ease", transition: "transform .15s ease", cursor: "pointer" }}>
      <style>{"@keyframes fpmToastIn{from{transform:translateY(-120%);opacity:0}to{transform:none;opacity:1}}"}</style>
      <span style={{ width: 40, height: 40, borderRadius: 13, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><KindIcon kind={k.kind} /></span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <b style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{done === "ok" ? "Đã kết bạn" : n.title}</b>
        {n.body && done !== "ok" && <span style={{ fontSize: 12.5, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.body}</span>}
      </span>
      {k.kind === "req" && done !== "ok" && <>
        <button type="button" data-testid="notif-toast-view" onClick={(e) => { e.stopPropagation(); open(); }} style={{ height: 34, padding: "0 12px", borderRadius: 10, border: "none", background: "#F1F5F9", color: "#475569", fontSize: 13, fontWeight: 800, fontFamily: "inherit", flexShrink: 0 }}>Xem</button>
        <button type="button" data-testid="notif-toast-accept" onClick={accept} disabled={busy} style={{ height: 34, padding: "0 12px", borderRadius: 10, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontSize: 13, fontWeight: 800, fontFamily: "inherit", flexShrink: 0, opacity: busy ? 0.7 : 1 }}>Đồng ý</button>
      </>}
    </div>,
    document.body,
  );
}
