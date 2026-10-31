// 30/10 (chủ dự án chốt bản vẽ "Khoe Pi & giao lưu" màn 6–10): Bạn bè & Xếp hạng.
// 3 tab: Xếp hạng (Chăm chỉ · Vận động · Hành trình cân, Tất cả / Bạn bè) · Bạn bè (mã kết bạn, lời mời, thử thách nhóm, danh sách) · Khoe (Khoe Pi, Pi đẹp tuần, tim nhận được).
// Bấm 1 người bạn → phòng Pi của bạn (thả tim 1 lần / ngày). Số do máy chủ tính (supabase/migrations/20261030190000_pi_ban_be.sql), app chỉ hiển thị.
// Khoảng cách theo app thật: lề 12, giữa các khối 12, trong thẻ 16, bo 20, dòng danh sách 56 (64 ở Hành trình cân).
import { useCallback, useEffect, useState } from "react";
import { SubPage, Icon, GRAD_BLUE } from "../mobile/ui";
import { AppIcon } from "../mobile/icons";
import { ltCard } from "../theme";
import { supabase } from "../lib/supabase";
import { track } from "../lib/track";
import { weekRange, todayVN, diffDays, nowVNParts } from "../lib/dateVN";
import { qrMatrix, qrSvgPath } from "../lib/qr";
import { actOf } from "../lib/activity";
import { PetAvatar } from "./PetAvatar";
import { Stage, PIc } from "./PetScreens";
import { roomTime } from "./PetRoom";
import { KhoePiSheet } from "./KhoePiSheet";
import { piPageUrl } from "../pi/khoe";
import { PI_NOTES } from "./piNotes";
import { sfx } from "../lib/sfx";
import { PiCardSheet } from "./PiCardSheet";

const card = { ...ltCard, margin: "0 12px" };
const sub = { fontSize: 12, fontWeight: 600, color: "#64748B", lineHeight: 1.35 };
const BOARDS = [["cham", "Chăm chỉ"], ["vandong", "Vận động"], ["hanhtrinh", "Hành trình cân"]];
const fmt = (n) => Number(n || 0).toLocaleString("vi-VN");
const dm = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

/** mặt Pi tròn 40 (thân Pi đầy đủ, khung chỉ lộ đầu) */
export function PiHead({ p, size = 40 }) {
  return (
    <span aria-hidden="true" style={{ position: "relative", width: size, height: size, borderRadius: size / 2, overflow: "hidden", background: "#DBEAFE", flexShrink: 0, display: "block" }}>
      <span style={{ position: "absolute", left: "50%", top: Math.round(size * 0.04), transform: "translateX(-50%)" }}>
        <PetAvatar variant={p?.variant || "nam"} color={p?.color} equipped={p?.equipped || {}} size={Math.round(size * 1.85)} still face="vui" />
      </span>
    </span>
  );
}
const RankNum = ({ n }) => n <= 3
  ? <span style={{ width: 24, height: 24, borderRadius: 12, background: ["#F59E0B", "#94A3B8", "#B45309"][n - 1], color: "#FFF", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
  : <span style={{ width: 24, textAlign: "center", fontSize: 15, fontWeight: 900, color: "#64748B", flexShrink: 0 }}>{n}</span>;
const Pill = ({ on, onClick, children, testid, h = 36, solid }) => (
  <button type="button" data-testid={testid} aria-pressed={on} onClick={onClick}
    style={{ height: h, padding: "0 12px", borderRadius: h / 2, border: "none", fontFamily: "inherit", fontSize: h < 34 ? 12 : 13, fontWeight: 800, whiteSpace: "nowrap",
      background: on ? (solid ? "#0062F0" : "#FFFFFF") : solid ? "#FFFFFF" : "rgba(15,23,42,0.06)", color: on ? (solid ? "#FFFFFF" : "#0F172A") : solid ? "#475569" : "#64748B" }}>{children}</button>
);
const Btn = ({ kind = "pri", onClick, children, testid, disabled, small }) => (
  <button type="button" data-testid={testid} onClick={onClick} disabled={disabled}
    style={{ height: small ? 32 : 38, padding: small ? "0 10px" : "0 14px", borderRadius: 12, border: "none", fontFamily: "inherit", fontSize: small ? 12.5 : 13.5, fontWeight: 900, whiteSpace: "nowrap", flexShrink: 0,
      background: kind === "pri" ? GRAD_BLUE : "#EEF4FF", color: kind === "pri" ? "#FFFFFF" : "#0062F0", opacity: disabled ? 0.5 : 1 }}>{children}</button>
);
const Toggle = ({ on, onClick, testid, title, desc }) => (
  <button type="button" data-testid={testid} aria-pressed={on} onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, border: "none", background: "none", padding: 0, fontFamily: "inherit", textAlign: "left", color: "#0F172A", width: "100%" }}>
    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 14, fontWeight: 800 }}>{title}</span><span style={sub}>{desc}</span></span>
    <span aria-hidden="true" style={{ width: 46, height: 28, borderRadius: 14, background: on ? "#16A34A" : "#CBD5E1", position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 11, background: "#FFF", boxShadow: "0 1px 2px rgba(0,0,0,.2)", transition: "left .15s" }} /></span>
  </button>
);

// 31/10 (bản vẽ "Thả tim người lạ…"): nút tim 36×36 bo 18; chưa thả #F1F5F9 / tim viền #94A3B8, đã thả #FFE4E6 / tim đặc #E11D48
const HEART_D = "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z";
export const HeartBtn = ({ on, onClick, testid, label, size = 36 }) => (
  <button type="button" data-testid={testid} aria-label={label} aria-pressed={!!on} onClick={onClick}
    style={{ width: size, height: size, borderRadius: size / 2, border: "none", background: on ? "#FFE4E6" : "#F1F5F9", color: on ? "#E11D48" : "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d={HEART_D} fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={on ? 0 : 2.2} strokeLinejoin="round" /></svg>
  </button>
);

function valueOf(kind, r) {
  if (kind === "cham") return `${fmt(r.value)} Hạt`;
  if (kind === "vandong") return `${fmt(r.value)} phút`;
  return `${fmt(r.value)}%`;
}
function subOf(kind, r) {
  if (kind === "vandong") return (r.sub || "").split(",").filter(Boolean).map((t) => actOf(t).label).join(", ") || `Cấp ${r.level}`;
  if (kind === "hanhtrinh") return r.sub || "";
  return `Cấp ${r.level} · ${r.variant === "nu" ? "Pi nữ" : "Pi nam"}`;
}

// ---------- Tab Xếp hạng ----------
function BoardTab({ showToast, onOpen }) {
  const [kind, setKind] = useState("cham");
  const [scope, setScope] = useState("all");
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    setErr("");
    const { data, error } = await supabase.rpc("pi_board", { p_kind: kind, p_scope: scope });
    if (error) { setErr("Chưa tải được bảng xếp hạng, kéo xuống thử lại."); return; }
    setD(data);
  }, [kind, scope]);
  useEffect(() => { setD(null); load(); }, [load]);
  const setOpt = async (k, v) => {
    const { data, error } = await supabase.rpc("pi_board_set", { p_board_on: k === "board" ? v : null, p_show_weight: k === "weight" ? v : null, p_stranger_req: k === "stranger" ? v : null });
    if (error) { showToast?.({ text: "Chưa lưu được, thử lại." }); return; }
    setD((x) => ({ ...x, board_on: data.board_on, show_weight: data.show_weight, stranger_req: data.stranger_req }));
    load();
  };
  const rows = d?.rows || [];
  // 31/10: thả tim cho cả người lạ trên bảng (máy chủ giới hạn 20 người lạ / ngày)
  const heart = async (r) => {
    if (r.hearted) return;
    setD((x) => ({ ...x, rows: x.rows.map((y) => (y.nick === r.nick ? { ...y, hearted: true } : y)) }));
    const { data, error } = await supabase.rpc("pi_heart", { p_nick: r.nick });
    if (error || !data?.ok) {
      setD((x) => ({ ...x, rows: x.rows.map((y) => (y.nick === r.nick ? { ...y, hearted: false } : y)) }));
      showToast?.({ text: data?.why === "limit" ? "Hôm nay bạn đã thả đủ 20 tim cho người lạ, mai thả tiếp nha" : "Chưa thả tim được, thử lại." });
      return;
    }
    sfx("pop"); track("rank_heart");
  };
  const meIn = rows.some((r) => r.me);
  const tip = kind === "cham" ? "Hạt kiếm đúng ngày từ thứ Hai: ăn đúng bữa, uống đủ nước, cân tuần. Top 3 được 50 / 30 / 20 Hạt sáng thứ Hai."
    : kind === "vandong" ? "Phút \"Vận động thêm\" ghi đúng ngày, tối đa 90 phút mỗi ngày. Top 3 được 50 / 30 / 20 Hạt sáng thứ Hai."
    : "% chặng đường tới cân mục tiêu của mỗi người. Không hiện số kg. Mỗi tuần tối đa +1% cân nặng, giảm nhanh hơn không leo hạng nhanh hơn.";
  return (
    <>
      <div data-testid="rank-boards" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, margin: "0 12px" }}>
        {BOARDS.map(([k, t]) => <Pill key={k} solid on={kind === k} onClick={() => setKind(k)} testid={`rank-board-${k}`}>{t}</Pill>)}
      </div>
      <div style={{ display: "flex", gap: 8, margin: "0 12px" }}>
        <Pill h={30} on={scope === "all"} onClick={() => setScope("all")} testid="rank-scope-all">Tất cả{scope === "all" && d ? ` · ${d.total} người` : ""}</Pill>
        <Pill h={30} on={scope === "friends"} onClick={() => setScope("friends")} testid="rank-scope-friends">Bạn bè{d ? ` · ${d.friends}` : ""}</Pill>
      </div>
      <div data-testid="rank-list" data-kind={kind} data-ready={d ? "1" : undefined} style={{ ...card, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!d && <span style={{ ...sub, padding: 16 }}>{err || "Đang tải…"}</span>}
        {d && !rows.length && <span style={{ ...sub, padding: 16 }}>{kind === "hanhtrinh" ? "Chưa ai khoe tiến độ cân tuần này. Bật \"Khoe tiến độ cân\" ở dưới để có tên trên bảng." : scope === "friends" ? "Chưa có bạn nào có số tuần này. Mời bạn ở tab Bạn bè." : "Tuần này chưa có ai. Bạn là người đầu tiên nha!"}</span>}
        {rows.map((r, i) => (
          <div key={`${r.rank}-${i}`} data-testid={r.me ? "rank-me" : "rank-row"} style={{ display: "flex", alignItems: "center", gap: 12, padding: !r.me && r.nick ? "0 12px 0 16px" : "0 16px", minHeight: kind === "hanhtrinh" ? 64 : 56, background: r.me ? "#EEF4FF" : undefined, borderTop: i ? "1px solid #EEF2FA" : "none" }}>
            <RankNum n={r.rank} />
            {/* 31/10: chạm Pi / tên người khác → thẻ Pi (bạn bè → phòng Pi) */}
            <button type="button" data-testid="rank-open" disabled={r.me || !r.nick} onClick={() => onOpen?.(r)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, border: "none", background: "none", padding: 0, fontFamily: "inherit", textAlign: "left", color: "#0F172A", cursor: r.me || !r.nick ? "default" : "pointer" }}>
            <PiHead p={r} />
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}{r.me ? " (bạn)" : ""}</span>
              <span style={{ ...sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subOf(kind, r)}</span>
              {kind === "hanhtrinh" && <span style={{ display: "block", height: 6, borderRadius: 3, background: "#EEF2FA", marginTop: 4, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${Math.min(100, r.value)}%`, borderRadius: 3, background: "linear-gradient(90deg,#34D399,#059669)" }} /></span>}
            </span>
            </button>
            <span style={{ fontSize: 15, fontWeight: 900, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", flexShrink: 0, ...(kind === "hanhtrinh" ? { color: "#047857" } : { color: "#92400E", background: "#FEF3C7", borderRadius: 12, padding: "3px 9px" }) }}>{valueOf(kind, r)}</span>
            {!r.me && r.nick && <HeartBtn on={r.hearted} testid="rank-heart" label={`Thả tim cho ${r.name}`} onClick={() => heart(r)} />}
          </div>
        ))}
        {d?.me && !meIn && <div data-testid="rank-me" style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", minHeight: 56, background: "#EEF4FF", borderTop: "1px solid #EEF2FA" }}><RankNum n={d.me.rank} /><span style={{ flex: 1, fontSize: 15, fontWeight: 900 }}>Bạn</span><span style={{ fontSize: 15, fontWeight: 900 }}>{valueOf(kind, d.me)}</span></div>}
      </div>
      <div style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={sub}>{tip}</span>
        {d && <Toggle testid="rank-opt-board" on={d.board_on} onClick={() => setOpt("board", !d.board_on)} title="Có tên trên bảng xếp hạng" desc="Tắt thì bạn vẫn thấy hạng của mình, người khác không thấy bạn" />}
        {d && <Toggle testid="rank-opt-weight" on={d.show_weight} onClick={() => setOpt("weight", !d.show_weight)} title="Khoe tiến độ cân" desc="Chỉ hiện % chặng đường tới cân mục tiêu, không bao giờ hiện số kg" />}
        {d && <Toggle testid="rank-opt-stranger" on={d.stranger_req !== false} onClick={() => setOpt("stranger", d.stranger_req === false)} title="Cho người lạ xin kết bạn" desc="Tắt thì người lạ trên bảng chỉ thả tim được, không gửi lời mời" />}
      </div>
    </>
  );
}

// ---------- Tab Bạn bè ----------
function FriendsTab({ data, notes = [], reload, onRoom, showToast }) {
  const [code, setCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [qr, setQr] = useState(false);
  const [busy, setBusy] = useState("");
  const add = async () => {
    const c = code.trim();
    if (c.length < 4 || busy) return;
    setBusy("add");
    const { data: r, error } = await supabase.rpc("pi_friend_add", { p_code: c });
    setBusy("");
    if (error || !r) { showToast?.({ text: "Chưa gửi được, thử lại." }); return; }
    if (!r.ok) { showToast?.({ text: r.why === "self" ? "Đây là mã của chính bạn" : r.why === "full" ? "Bạn đã có quá nhiều bạn" : "Không thấy mã này" }); return; }
    showToast?.({ text: r.status === "ok" ? `Đã kết bạn với ${r.name}` : `Đã gửi lời mời tới ${r.name}` });
    track("friend_add", { status: r.status });
    setCode(""); setAdding(false); reload();
  };
  const answer = async (nick, yes) => {
    setBusy(nick);
    const { error } = await supabase.rpc("pi_friend_answer", { p_nick: nick, p_accept: yes });
    setBusy("");
    if (error) { showToast?.({ text: "Chưa lưu được, thử lại." }); return; }
    if (yes) showToast?.({ text: "Đã kết bạn" });
    reload();
  };
  const heart = async (nick) => {
    setBusy(nick);
    const { data: r } = await supabase.rpc("pi_heart", { p_nick: nick });
    setBusy("");
    if (r?.ok) { track("friend_heart"); reload(); }
  };
  if (!data) return <span style={{ ...sub, margin: "0 16px" }}>Đang tải…</span>;
  const ch = data.challenge || {};
  return (
    <>
      <div style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={sub}>Mã của bạn</span><b data-testid="friend-my-code" style={{ fontSize: 20, fontWeight: 900, letterSpacing: "0.06em" }}>{data.me?.code || "…"}</b></span>
          <Btn kind="soft" testid="friend-qr" onClick={() => setQr((v) => !v)}>Mã QR</Btn>
          <Btn testid="friend-add-open" onClick={() => setAdding((v) => !v)}>Thêm bạn</Btn>
        </div>
        {qr && data.me?.nick && (() => { const m = qrMatrix(piPageUrl(data.me.nick)); const n = m.length + 4; return (
          <div data-testid="friend-qr-box" style={{ alignSelf: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <svg width="180" height="180" viewBox={`0 0 ${n} ${n}`} style={{ background: "#FFF", borderRadius: 12 }} role="img" aria-label="Mã QR trang Pi của bạn"><path d={qrSvgPath(m, 2)} fill="#0F172A" /></svg>
            <span style={sub}>Bạn bè quét mã để mở trang Pi của bạn</span>
          </div>); })()}
        {adding && (
          <div style={{ display: "flex", gap: 8 }}>
            <input data-testid="friend-add-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="Ví dụ: CUTEO12" autoCapitalize="characters" autoComplete="off"
              style={{ flex: 1, minWidth: 0, height: 40, borderRadius: 12, border: "1.5px solid #DCE7FF", padding: "0 12px", fontSize: 15, fontWeight: 800, fontFamily: "inherit", letterSpacing: "0.04em" }} />
            <Btn testid="friend-add-send" onClick={add} disabled={code.length < 4 || busy === "add"}>{busy === "add" ? "Đang gửi…" : "Gửi"}</Btn>
          </div>
        )}
      </div>
      {(data.incoming || []).map((p) => (
        <div key={p.nick} data-testid="friend-incoming" style={{ ...card, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <PiHead p={p} />
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 14, fontWeight: 900 }}>{p.name} muốn kết bạn</b><span style={sub}>Cấp {p.level} · {p.variant === "nu" ? "Pi nữ" : "Pi nam"}</span></span>
          <Btn kind="soft" small testid="friend-decline" onClick={() => answer(p.nick, false)} disabled={busy === p.nick}>Bỏ qua</Btn>
          <Btn small testid="friend-accept" onClick={() => answer(p.nick, true)} disabled={busy === p.nick}>Đồng ý</Btn>
        </div>
      ))}
      {notes.length > 0 && (
        <div data-testid="friend-notes" style={{ ...card, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#64748B", padding: "12px 16px 4px" }}>Lời nhắn cho Pi của bạn</span>
          {notes.slice(0, 5).map((n, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", minHeight: 56, borderTop: i ? "1px solid #EEF2FA" : "none" }}>
              <PiHead p={n} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}><b style={{ fontSize: 14, fontWeight: 900 }}>{n.name}{n.new ? <span style={{ marginLeft: 6, fontSize: 11, color: "#E11D48" }}>● mới</span> : null}</b><span style={sub}>“{n.text}” · {dm(n.day)}</span></span>
            </div>
          ))}
        </div>
      )}
      {data.friends?.length > 0 && (
        <div data-testid="friend-challenge" style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5, fontWeight: 900 }}>Tuần này: {ch.goal} ngày đủ nước</b><span style={sub}>Còn {Math.max(0, ch.left)} ngày · cả nhóm đạt thì mỗi người +30 Hạt · bạn đang {ch.mine}/{ch.goal}</span></span>
          <span style={{ display: "block", height: 8, borderRadius: 4, background: "#E0F2FE", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${ch.total ? Math.round((ch.done / ch.total) * 100) : 0}%`, background: "linear-gradient(90deg,#22D3EE,#0891B2)" }} /></span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0E7490" }}>{ch.done} / {ch.total} người đã đủ {ch.goal} ngày</span>
        </div>
      )}
      <p style={{ margin: "4px 16px -4px", fontSize: 16, fontWeight: 900 }}>Bạn bè{data.friends?.length ? ` · ${data.friends.length}` : ""}</p>
      <div data-testid="friend-list" style={{ ...card, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!data.friends?.length && <span style={{ ...sub, padding: 16 }}>Chưa có bạn nào. Gửi mã của bạn cho bạn bè, hoặc bấm Thêm bạn rồi nhập mã của họ.</span>}
        {(data.friends || []).map((p, i) => (
          <div key={p.nick} data-testid="friend-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", minHeight: 56, borderTop: i ? "1px solid #EEF2FA" : "none" }}>
            <button type="button" onClick={() => onRoom(p.nick)} data-testid="friend-open" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, border: "none", background: "none", padding: 0, fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
              <PiHead p={p} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                <b style={{ fontSize: 15, fontWeight: 900 }}>{p.name}</b>
                <span style={{ ...sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.away >= 2 ? `Vắng ${p.away} ngày · rủ bạn quay lại` : p.meals ? `Hôm nay đã ăn ${p.meals} bữa${p.water ? " · đủ nước" : ""}` : p.streak >= 2 ? `${p.streak} ngày liền chăm Pi` : `Cấp ${p.level}`}</span>
              </span>
            </button>
            <button type="button" data-testid="friend-heart" aria-label={`Thả tim cho ${p.name}`} aria-pressed={p.hearted} disabled={p.hearted || busy === p.nick} onClick={() => heart(p.nick)}
              style={{ width: 34, height: 34, borderRadius: 17, border: "none", background: p.hearted ? "#FFE4E6" : "#F1F5F9", color: p.hearted ? "#E11D48" : "#94A3B8", fontSize: 16, flexShrink: 0 }}>♥</button>
            <span aria-hidden="true" style={{ color: "#94A3B8" }}>{Icon.chev(16)}</span>
          </div>
        ))}
      </div>
      {(data.outgoing || []).length > 0 && <span style={{ ...sub, margin: "0 16px" }} data-testid="friend-outgoing">Đang chờ {data.outgoing.map((p) => p.name).join(", ")} đồng ý</span>}
    </>
  );
}

// ---------- Tab Khoe ----------
function ShowTab({ pet, friends, onKhoe, showToast }) {
  const [d, setD] = useState(null);
  const load = useCallback(async () => { const { data } = await supabase.rpc("pi_beauty"); setD(data || { left: 0, entries: [] }); }, []);
  useEffect(() => { load(); }, [load]);
  const vote = async (p) => {
    if (p.me || p.voted) return;
    if (!d.left) { showToast?.({ text: "Bạn đã dùng hết 3 phiếu tuần này" }); return; }
    const { data } = await supabase.rpc("pi_vote", { p_nick: p.nick });
    if (data?.ok) { track("pi_vote"); load(); }
  };
  const h = friends?.hearts;
  // 31/10 (chủ dự án: "khoe lên web mà mò web không thấy chỗ đó"): trang Pi trên web chỉ mở bằng link / mã QR, không có ở menu web → hiện link ở đây
  const [web, setWeb] = useState(null);
  useEffect(() => { supabase.rpc("pi_share_get", { p_device: null }).then(({ data }) => setWeb(data || null)); }, []);
  const url = web?.nick ? piPageUrl(web.nick) : "";
  const copy = async () => { try { await navigator.clipboard.writeText(url); showToast?.({ text: "Đã chép link trang Pi" }); } catch (e) { showToast?.({ text: url }); } };
  return (
    <>
      <div style={{ ...card, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 52, height: 60, display: "flex", alignItems: "flex-end", justifyContent: "center", flexShrink: 0 }}><PetAvatar variant={pet.variant} color={pet.color} equipped={pet.equipped} size={60} still face="cuoilon" /></span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14, fontWeight: 900 }}>Khoe Pi lên Story</b><span style={sub}>Ảnh đẹp kèm mã mời, bạn vào nuôi cả hai được 50 Hạt</span></span>
        <Btn testid="show-khoe" onClick={onKhoe}>Khoe Pi</Btn>
      </div>
      {web && (
        <div data-testid="show-web" data-on={web.web_on ? "1" : "0"} style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <b style={{ fontSize: 14, fontWeight: 900 }}>Trang Pi của bạn trên web</b>
            <span style={{ ...sub, wordBreak: "break-all" }}>{web.web_on ? <>Đang mở: <b style={{ color: "#0F172A" }}>{url.replace(/^https?:\/\//, "")}</b> · chỉ ai có link hoặc quét mã QR trên ảnh khoe mới vào được, web không liệt kê</> : "Chưa mở. Bấm Khoe Pi rồi Lưu ảnh hoặc Chia sẻ là trang tự mở, bạn bè quét mã QR trên ảnh để xem."}</span>
          </span>
          {web.web_on && (
            <div style={{ display: "flex", gap: 8 }}>
              <a data-testid="show-web-open" href={url} target="_blank" rel="noopener noreferrer" style={{ height: 38, padding: "0 14px", borderRadius: 12, background: GRAD_BLUE, color: "#FFFFFF", fontSize: 13.5, fontWeight: 900, display: "flex", alignItems: "center", textDecoration: "none" }}>Mở trang</a>
              <Btn kind="soft" testid="show-web-copy" onClick={copy}>Chép link</Btn>
            </div>
          )}
        </div>
      )}
      <div data-testid="beauty" style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5, fontWeight: 900 }}>Pi đẹp tuần</b><span style={sub}>Còn {d?.left ?? 3} phiếu · chốt sáng thứ Hai · Pi nhiều tim nhất (từ 3 tim) được 100 Hạt</span></span>
        {d && d.entries.length <= 1 && <span style={sub}>Kết bạn để bình chọn Pi của nhau. Mỗi người 3 phiếu mỗi tuần, không tự bầu mình.</span>}
        {d && d.entries.length > 1 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {d.entries.map((p) => (
              <button key={p.nick || "me"} type="button" data-testid={p.me ? "beauty-me" : "beauty-entry"} onClick={() => vote(p)} disabled={p.me || p.voted}
                style={{ border: p.me ? "2px solid #FACC15" : "none", borderRadius: 14, padding: "6px 4px 8px", background: "linear-gradient(180deg,#3B1C6B,#7C2D12)", color: "#FFF", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontFamily: "inherit" }}>
                <span style={{ height: 96, display: "flex", alignItems: "flex-end" }}><PetAvatar variant={p.variant} color={p.color} equipped={p.equipped} size={92} still face="vui" /></span>
                <b style={{ fontSize: 12, fontWeight: 900, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.me ? "Bạn" : p.name}</b>
                <span style={{ fontSize: 12, fontWeight: 900, color: p.voted ? "#FB7185" : "#FDA4AF" }}>♥ {p.votes}{p.voted ? " · đã bầu" : ""}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ ...card, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 36, height: 36, borderRadius: 12, background: "linear-gradient(180deg,#FB7185,#E11D48)", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>♥</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b data-testid="hearts-week" style={{ fontSize: 14, fontWeight: 900 }}>{h?.n || 0} tim tuần này</b><span style={sub}>{h?.from?.length ? `từ ${h.from.slice(0, 3).join(", ")}${h.from.length > 3 ? " và bạn khác" : ""}` : "Bạn bè ghé phòng Pi thả tim sẽ hiện ở đây"}</span></span>
      </div>
    </>
  );
}

// ---------- Phòng của bạn ----------
function FriendRoom({ nick, onBack, showToast }) {
  const [r, setR] = useState(undefined);
  const [sent, setSent] = useState(null); // số câu đã nhắn hôm nay (null = chưa nhắn)
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([supabase.rpc("pi_room", { p_nick: nick }), supabase.rpc("pi_note_sent", { p_nick: nick })]);
    setR(a.data || null); setSent(b.data ?? null);
  }, [nick]);
  useEffect(() => { load(); }, [load]);
  const note = async (i) => {
    if (sent != null) return;
    const { data } = await supabase.rpc("pi_note", { p_nick: nick, p_msg: i });
    if (data?.ok) { setSent(i); track("pi_note"); showToast?.({ text: `Đã nhắn cho Pi của ${r.name}` }); }
    else if (data?.why === "today") showToast?.({ text: "Hôm nay bạn đã nhắn rồi, mai nhắn tiếp nha" });
  };
  const heart = async () => {
    const { data } = await supabase.rpc("pi_heart", { p_nick: nick });
    if (data?.ok) { showToast?.({ text: `Đã thả tim cho Pi của ${r.name}` }); load(); }
  };
  const h = nowVNParts().hour;
  const fake = r && { name: r.name, variant: r.variant, equipped: r.equipped || {}, mood: "vui", face: r.face || "auto", hour: h, time: roomTime(h), floorY: {} };
  return (
    <SubPage title={r ? `Phòng của ${r.name}` : "Phòng của bạn"} subtitle={r ? `Cấp ${r.level} · ${r.variant === "nu" ? "Pi nữ" : "Pi nam"} · ${r.owned} món` : undefined} onBack={onBack}>
      <div data-testid="friend-room" style={{ padding: "12px 0 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {r === undefined && <span style={{ ...sub, margin: "0 16px" }}>Đang tải…</span>}
        {r === null && <span style={{ ...sub, margin: "0 16px" }}>Chỉ bạn bè mới vào được phòng này.</span>}
        {r && <>
          <div style={{ padding: "0 12px" }}><Stage pet={fake} height={290} size={200} live={false}>
            <span style={{ position: "absolute", left: 14, right: 14, top: 12, display: "flex", justifyContent: "center" }}><span style={{ background: "#FFF", borderRadius: 16, padding: "8px 13px", fontSize: 13, fontWeight: 700, color: "#334155", boxShadow: "0 6px 16px rgba(30,64,175,0.12)" }}>{r.meals ? `${r.name} đã ăn ${r.meals} bữa hôm nay rồi đó!` : r.streak >= 2 ? `${r.streak} ngày liền chăm Pi!` : `Chào bạn của ${r.name}!`}</span></span>
          </Stage></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, margin: "-2px 12px 0" }}>
            <button type="button" data-testid="room-heart" onClick={heart} disabled={r.hearted} style={{ ...ltCard, borderRadius: 18, border: "none", padding: "12px 6px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: "inherit", color: "#0F172A", opacity: r.hearted ? 0.7 : 1 }}>
              <span style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(180deg,#FB7185,#E11D48)", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>♥</span>
              <b style={{ fontSize: 14, fontWeight: 900 }}>{r.hearted ? "Đã thả tim" : "Thả tim"}</b><span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>{r.hearts} tim tuần này</span>
            </button>
            <div style={{ ...ltCard, borderRadius: 18, padding: "12px 6px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <AppIcon color="#F59E0B" size={44}>{PIc.flame(22)}</AppIcon>
              <b style={{ fontSize: 14, fontWeight: 900 }}>{r.streak} ngày</b><span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>liền chăm Pi</span>
            </div>
          </div>
          <div data-testid="room-notes" style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#64748B" }}>{sent != null ? "Hôm nay bạn đã nhắn" : `Nhắn cho Pi của ${r.name} (1 câu mỗi ngày)`}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PI_NOTES.map((t, i) => (sent == null || sent === i) && (
                <button key={i} type="button" data-testid="room-note" aria-pressed={sent === i} onClick={() => note(i)} disabled={sent != null}
                  style={{ height: 32, padding: "0 12px", borderRadius: 16, border: "none", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, background: sent === i ? "#0062F0" : "#EEF4FF", color: sent === i ? "#FFFFFF" : "#0062F0" }}>{t}</button>
              ))}
            </div>
          </div>
        </>}
      </div>
    </SubPage>
  );
}

export function PetSocialScreen({ pet, userId, onBack, showToast, initialTab }) {
  const [tab, setTab] = useState(["rank", "friends", "show"].includes(initialTab) ? initialTab : "rank"); // 31/10: lối tắt / thông báo mở đúng tab
  const [friends, setFriends] = useState(null);
  const [room, setRoom] = useState(null);
  const [khoe, setKhoe] = useState(false);
  const [notes, setNotes] = useState([]);
  const [cardNick, setCardNick] = useState(null); // 31/10: thẻ Pi người lạ
  const loadFriends = useCallback(async () => { const { data } = await supabase.rpc("pi_friends_list"); setFriends(data || { friends: [], incoming: [], outgoing: [] }); }, []);
  useEffect(() => { loadFriends(); track("social_open"); }, [loadFriends]);
  useEffect(() => { if (tab === "friends") supabase.rpc("pi_notes_list").then(({ data }) => setNotes(data || [])); }, [tab]);
  const wk = weekRange(todayVN());
  const left = Math.max(0, diffDays(todayVN(), wk.end));
  if (room) return <FriendRoom nick={room} onBack={() => { setRoom(null); loadFriends(); }} showToast={showToast} />;
  const nIn = friends?.incoming?.length || 0;
  return (
    <SubPage title="Bạn bè & Xếp hạng" subtitle={`Tuần ${dm(wk.start)} – ${dm(wk.end)} · còn ${left} ngày`} onBack={onBack}>
      <div data-testid="pet-social" style={{ padding: "12px 0 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div role="tablist" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", margin: "0 12px", background: "rgba(15,23,42,0.06)", borderRadius: 12, padding: 3, gap: 3 }}>
          {[["rank", "Xếp hạng"], ["friends", nIn ? `Bạn bè · ${nIn}` : "Bạn bè"], ["show", "Khoe"]].map(([k, t]) => (
            <button key={k} role="tab" aria-selected={tab === k} data-testid={`social-tab-${k}`} onClick={() => setTab(k)}
              style={{ height: 34, borderRadius: 9, border: "none", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, background: tab === k ? "#FFFFFF" : "transparent", color: tab === k ? "#0F172A" : "#475569", boxShadow: tab === k ? "0 1px 3px rgba(15,23,42,0.12)" : "none" }}>{t}</button>
          ))}
        </div>
        {tab === "rank" && <BoardTab showToast={showToast} onOpen={(r) => (r.fr === "ok" ? setRoom(r.nick) : setCardNick(r.nick))} />}
        {tab === "friends" && <FriendsTab data={friends} notes={notes} reload={loadFriends} onRoom={setRoom} showToast={showToast} />}
        {tab === "show" && <ShowTab pet={pet} friends={friends} onKhoe={() => setKhoe(true)} showToast={showToast} />}
      </div>
      {khoe && <KhoePiSheet pet={pet} userId={userId} showToast={showToast} onClose={() => setKhoe(false)} />}
      {cardNick && <PiCardSheet nick={cardNick} showToast={showToast} onClose={() => setCardNick(null)} onRoom={(n) => { setCardNick(null); setRoom(n); }} onChanged={loadFriends} />}
    </SubPage>
  );
}
