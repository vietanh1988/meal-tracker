// 31/10 (chủ dự án chốt bản B "Lối tắt: Phòng Pi, Xếp hạng, Bạn bè"): nút mặt Pi cạnh chuông ở đầu Hôm nay → menu thả xuống 4 dòng.
// Nút: kính 42×42 bo 21 như chuông; chấm đỏ = số lời mời kết bạn chờ (hoặc chấm khi có tim mới chưa xem).
// Menu: rộng 250, bo 18, nền trắng, bóng 0 16 40 / 30%, pad 6; dòng cao 56, ô icon 36 bo 12, chữ 14.5/800, phụ 12/600 #64748B; nền mờ 25% chạm để đóng.
// Mỗi dòng mở đúng chỗ: Phòng Pi → màn Pi · Xếp hạng → Bạn bè & Xếp hạng tab Xếp hạng · Bạn bè → tab Bạn bè · Khoe Pi → tab Khoe.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import { track } from "../lib/track";
import { notifKind } from "../lib/notifKind";
import { FONT, Icon } from "../mobile/ui";
import { PetAvatar } from "./PetAvatar";

const S = (d) => <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const IC = {
  room: S(<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" />),
  rank: S(<><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6" /></>),
  friends: S(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><circle cx="17" cy="9" r="2.6" /><path d="M17.5 14.5c2 .3 3.4 1.8 4 4" /></>),
  khoe: S(<><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 15l3-3 2 2 3-4" /><circle cx="9" cy="8" r="1.4" /></>),
};
const fmt = (n) => Number(n || 0).toLocaleString("vi-VN");

export function PiShortcut({ pet, userId, notif, onGo }) {
  const btn = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [rank, setRank] = useState(undefined);
  const [invites, setInvites] = useState(0);
  const loadInvites = async () => {
    if (!userId) return;
    const { data } = await supabase.from("pi_friends").select("by_user").eq("status", "pending").neq("by_user", userId);
    setInvites((data || []).length);
  };
  const loadRank = async () => {
    const { data } = await supabase.rpc("pi_board", { p_kind: "cham", p_scope: "all" });
    setRank(data?.me?.rank ?? null);
  };
  const unreadSocial = (notif?.items || []).some((n) => !n.is_read && ["heart", "req", "friend"].includes(notifKind(n).kind));
  useEffect(() => { loadInvites(); }, [userId, (notif?.items || []).map((n) => n.url).join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = () => {
    if (open) { setOpen(false); return; }
    const r = btn.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 10, right: Math.max(12, window.innerWidth - r.right - 50), arrow: r.left + r.width / 2 });
    setOpen(true); loadRank(); loadInvites(); track("pi_shortcut_open");
  };
  const go = (dest) => { setOpen(false); track("pi_shortcut", { dest }); onGo?.(dest); };
  if (!pet) return null;
  const rows = [
    ["room", "Phòng Pi", pet.tasksLeft > 0 ? `Còn ${pet.tasksLeft} việc · ${fmt(pet.seeds)} Hạt` : `Xong việc hôm nay · ${fmt(pet.seeds)} Hạt`, "#EEF4FF", "#0062F0"],
    ["rank", "Xếp hạng", rank === undefined ? "Đang tải hạng…" : rank ? `Hạng ${rank} tuần này` : "Chưa có hạng tuần này", "#FEF3C7", "#B45309"],
    ["friends", "Bạn bè", invites ? `${invites} lời mời kết bạn` : "Kết bạn, thả tim, nhắn Pi", "#FFE4E6", "#E11D48"],
    ["khoe", "Khoe Pi", "Ảnh khoe và trang Pi trên web", "#F3EEFF", "#6D28D9"],
  ];
  return (
    <>
      <button ref={btn} type="button" data-testid="pi-shortcut" aria-label="Lối tắt Pi" aria-expanded={open} onClick={toggle} className="fp-glass"
        style={{ position: "relative", width: 42, height: 42, borderRadius: 21, padding: 0, overflow: "visible", flexShrink: 0, display: "block" }}>
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: 21, overflow: "hidden" }}>
          <span style={{ position: "absolute", left: "50%", top: 2, transform: "translateX(-50%)" }}><PetAvatar variant={pet.variant} color={pet.color} equipped={pet.equipped} size={76} still face="vui" /></span>
        </span>
        {(invites > 0 || unreadSocial) && <span data-testid="pi-shortcut-dot" style={{ position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, background: "#EF4444", border: "2px solid #FFFFFF", color: "#FFFFFF", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", boxSizing: "border-box" }}>{invites || ""}</span>}
      </button>
      {open && pos && createPortal(
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(15,23,42,0.25)", fontFamily: FONT, animation: "fpmFade .15s ease" }}>
          <div data-testid="pi-menu" role="menu" onClick={(e) => e.stopPropagation()}
            style={{ position: "absolute", top: pos.top, right: pos.right, width: 250, background: "#FFFFFF", borderRadius: 18, boxShadow: "0 16px 40px rgba(15,23,42,0.3)", padding: 6, color: "#0F172A", boxSizing: "border-box" }}>
            <span aria-hidden="true" style={{ position: "absolute", top: -7, left: pos.arrow - (window.innerWidth - pos.right - 250) - 7, width: 14, height: 14, background: "#FFFFFF", transform: "rotate(45deg)", borderRadius: 3 }} />
            {rows.map(([k, t, sub, bg, fg], i) => (
              <button key={k} type="button" role="menuitem" data-testid={`pi-menu-${k}`} onClick={() => go(k)}
                style={{ position: "relative", width: "100%", height: 56, display: "flex", alignItems: "center", gap: 10, padding: "0 10px", border: "none", borderTop: i ? "1px solid #EEF2FA" : "none", borderRadius: 12, background: "transparent", fontFamily: "inherit", textAlign: "left", color: "#0F172A", boxSizing: "border-box" }}>
                <span style={{ width: 36, height: 36, borderRadius: 12, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{IC[k]}</span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <b style={{ fontSize: 14.5, fontWeight: 800 }}>{t}</b>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span>
                </span>
                {k === "friends" && invites > 0 && <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: "#EF4444", color: "#FFFFFF", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", boxSizing: "border-box" }}>{invites}</span>}
                <span aria-hidden="true" style={{ color: "#94A3B8", display: "flex" }}>{Icon.chev(16)}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
