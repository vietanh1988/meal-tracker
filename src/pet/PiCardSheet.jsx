// 31/10 (chủ dự án chốt bản vẽ "Thả tim người lạ, xin kết bạn, thông báo" khung 2): chạm 1 người trên Bảng xếp hạng → thẻ Pi của người đó.
// Sheet bo 24, pad 8 16 26, khe 14; phòng Pi cao 190 bo 20; tên 20/900 + nhãn Cấp / Pi nam-nữ; 3 ô số (#F8FAFC bo 14 pad 10);
// 2 nút cao 46 bo 14 (lưới 1fr / 1.3fr, khe 8): Thả tim (#FFE4E6 / #E11D48) · Kết bạn (xanh app) → "Đã gửi lời mời" (#F1F5F9 / #475569).
// Số do máy chủ trả (pi_card_view); giới hạn tim / lời mời do máy chủ chặn.
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import { track } from "../lib/track";
import { sfx } from "../lib/sfx";
import { nowVNParts } from "../lib/dateVN";
import { FONT, GRAD_BLUE, useLockScroll, useSwipeClose, SheetHandle } from "../mobile/ui";
import { Stage } from "./PetScreens";
import { roomTime } from "./PetRoom";

const HEART_D = "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z";
const fmt = (n) => Number(n || 0).toLocaleString("vi-VN");
const WHY = { off: "Bạn ấy đã tắt nhận lời mời kết bạn", wait: "Bạn ấy vừa từ chối, 7 ngày sau mới gửi lại được", limit: "Hôm nay bạn đã gửi đủ 10 lời mời, mai gửi tiếp nha", full: "Bạn đã có quá nhiều bạn" };

export function PiCardSheet({ nick, onClose, onRoom, onChanged, showToast }) {
  useLockScroll(true);
  const sw = useSwipeClose(onClose);
  const [r, setR] = useState(undefined);
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => { const { data } = await supabase.rpc("pi_card_view", { p_nick: nick }); setR(data || null); }, [nick]);
  useEffect(() => { load(); }, [load]);
  const heart = async () => {
    if (!r || r.hearted || busy) return;
    setBusy("heart");
    const { data } = await supabase.rpc("pi_heart", { p_nick: nick });
    setBusy("");
    if (data?.ok) { sfx("pop"); track("card_heart"); setR((x) => ({ ...x, hearted: true, hearts: data.hearts ?? (x.hearts || 0) + 1 })); }
    else showToast?.({ text: data?.why === "limit" ? "Hôm nay bạn đã thả đủ 20 tim cho người lạ, mai thả tiếp nha" : "Chưa thả tim được, thử lại." });
  };
  const friend = async () => {
    if (!r || busy) return;
    if (r.fr === "ok") { onRoom?.(nick); return; }
    setBusy("friend");
    const { data, error } = r.fr === "in"
      ? await supabase.rpc("pi_friend_answer", { p_nick: nick, p_accept: true })
      : await supabase.rpc("pi_friend_request", { p_nick: nick });
    setBusy("");
    if (error || !data) { showToast?.({ text: "Chưa gửi được, thử lại." }); return; }
    if (data.ok === false) { showToast?.({ text: WHY[data.why] || "Chưa gửi được, thử lại." }); return; }
    const st = data.status === "ok" ? "ok" : "out";
    setR((x) => ({ ...x, fr: st }));
    track("card_friend", { status: st });
    showToast?.({ text: st === "ok" ? `Đã kết bạn với ${r.name}` : `Đã gửi lời mời tới ${r.name}` });
    onChanged?.();
  };
  const h = nowVNParts().hour;
  const fake = r && { name: r.name, variant: r.variant, color: r.color, equipped: r.equipped || {}, mood: "vui", face: r.face || "auto", hour: h, time: roomTime(h), floorY: {} };
  const canAsk = r && !r.me && (r.fr || r.req_on !== false);
  const frLabel = !r ? "" : r.fr === "ok" ? "Vào phòng Pi" : r.fr === "out" ? "Đã gửi lời mời" : r.fr === "in" ? "Đồng ý kết bạn" : "Kết bạn";
  const stat = (v, l) => <div style={{ background: "#F8FAFC", borderRadius: 14, padding: 10, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}><b style={{ fontSize: 17, fontWeight: 900 }}>{v}</b><span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748B" }}>{l}</span></div>;
  const tag = (t, c, bg) => <span style={{ fontSize: 11, fontWeight: 800, color: c, background: bg, padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap" }}>{t}</span>;
  const btn = { height: 46, borderRadius: 14, border: "none", fontFamily: "inherit", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
  return createPortal(
    <div className="fpm" onClick={sw.close} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,0.45)", fontFamily: FONT, color: "#0F172A", animation: "fpmFade .15s ease" }}>
      <div ref={sw.ref} {...sw.swipe} data-testid="pi-card-sheet" role="dialog" aria-modal="true" aria-label={r ? `Pi của ${r.name}` : "Pi"} onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 26px) 16px", display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box", animation: "fpmSheetUp .2s ease" }}>
        <SheetHandle />
        {r === undefined && <span style={{ fontSize: 13, color: "#64748B", padding: "24px 0", textAlign: "center" }}>Đang tải…</span>}
        {r === null && <span style={{ fontSize: 13, color: "#64748B", padding: "24px 0", textAlign: "center" }}>Bạn ấy đã ẩn tên khỏi bảng xếp hạng.</span>}
        {r && <>
          <div style={{ borderRadius: 20, overflow: "hidden" }}><Stage pet={fake} height={190} size={150} live={false} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <b data-testid="pi-card-name" style={{ fontSize: 20, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</b>
            {tag(`Cấp ${r.level}`, "#6D28D9", "#F3EEFF")}
            {r.variant === "nu" ? tag("Pi nữ", "#BE185D", "#FCE7F3") : tag("Pi nam", "#1D4ED8", "#DBEAFE")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {stat(r.rank ? `#${r.rank}` : "—", "Hạng tuần")}{stat(fmt(r.value), "Hạt tuần này")}{stat(fmt(r.hearts), "tim tuần này")}
          </div>
          {!r.me && (
            <div style={{ display: "grid", gridTemplateColumns: canAsk ? "1fr 1.3fr" : "1fr", gap: 8 }}>
              <button type="button" data-testid="pi-card-heart" aria-pressed={!!r.hearted} onClick={heart} disabled={busy === "heart"} style={{ ...btn, background: "#FFE4E6", color: "#E11D48" }}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d={HEART_D} fill={r.hearted ? "currentColor" : "none"} stroke="currentColor" strokeWidth={r.hearted ? 0 : 2.2} strokeLinejoin="round" /></svg>
                {r.hearted ? "Đã thả tim" : "Thả tim"}
              </button>
              {canAsk && (
                <button type="button" data-testid="pi-card-friend" data-fr={r.fr || ""} onClick={friend} disabled={r.fr === "out" || busy === "friend"}
                  style={{ ...btn, background: r.fr === "out" ? "#F1F5F9" : GRAD_BLUE, color: r.fr === "out" ? "#475569" : "#FFFFFF" }}>{busy === "friend" ? "Đang gửi…" : frLabel}</button>
              )}
            </div>
          )}
          <span style={{ fontSize: 12, color: "#64748B", textAlign: "center", lineHeight: 1.45 }}>
            {r.me ? "Đây là Pi của bạn." : !canAsk ? "Bạn ấy đã tắt nhận lời mời kết bạn, bạn vẫn thả tim được." : "Kết bạn rồi thì xem được phòng Pi, gửi lời nhắn và bầu Pi đẹp tuần cho nhau."}
          </span>
        </>}
      </div>
    </div>,
    document.body,
  );
}
