// 30/10 (chủ dự án chốt bản vẽ "Khoe Pi" màn 1–2): sheet Khoe Pi mở từ nút trong phòng Pi.
// Xem trước ảnh 1080×1920 (src/pi/khoe.js) · chọn khung · 3 viên bật / tắt (Số liệu tuần · Tiến độ cân · Mã mời) · Lưu ảnh / Chia sẻ.
// Lần đầu Lưu / Chia sẻ → bật trang fipilotai.com/pi/<biệt danh> (mã QR trên ảnh mở trang này) + tải ảnh xem trước (og) lên kho pi-share.
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, FONT, GRAD_BLUE, useLockScroll, useSwipeClose, SheetHandle } from "../mobile/ui";
import { supabase } from "../lib/supabase";
import { track } from "../lib/track";
import { todayVN } from "../lib/dateVN";
import { deviceId } from "../lib/device";
import { PI_MANIFEST, PI_BASE, PI_VER, roomFile, piRoomTime } from "../pi/piCatalog";
import { PI_ITEM } from "../pi/PiPet";
import { faceOf } from "./PetAvatar";
import { sceneOf } from "../lib/petMath";
import { drawKhoe, khoeFrames, weekStats, toBlob, piPageUrl } from "../pi/khoe";

const Opt = ({ on, children, onClick, testid, disabled }) => (
  <button type="button" data-testid={testid} aria-pressed={on} disabled={disabled} onClick={onClick}
    style={{ height: 36, borderRadius: 18, border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 800, padding: "0 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      background: on ? "#DCFCE7" : "#F1F5F9", color: disabled ? "#CBD5E1" : on ? "#15803D" : "#64748B" }}>
    {on ? "✓ " : ""}{children}
  </button>
);

export function KhoePiSheet({ pet, userId, onClose, showToast }) {
  useLockScroll(true);
  const sw = useSwipeClose(onClose);
  const today = todayVN();
  const frames = useMemo(() => khoeFrames({ streak: pet.streak, trophies: pet.trophies, equipped: pet.equipped, man: PI_MANIFEST }), [pet.streak, pet.trophies, pet.equipped]);
  const [sel, setSel] = useState("phong");
  const [opt, setOpt] = useState({ stats: true, weight: false, code: true });
  const [share, setShare] = useState(null); // { nick, code, web_on }
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const blobRef = useRef(null);

  useEffect(() => {
    let off = false;
    supabase.rpc("pi_share_get", { p_device: deviceId() }).then(({ data, error }) => { if (off) return; if (error) setErr("Chưa tải được mã mời, thử lại sau."); else setShare(data); });
    track("khoe_open");
    return () => { off = true; };
  }, []);

  const frame = frames.find((f) => f.id === sel) || frames[0];
  const base = {
    name: pet.name, level: pet.level?.n || 1, streak: pet.streak || 0, variant: pet.variant, equipped: pet.equipped || {}, owned: pet.owned || [],
    face: ((f) => (f && f !== "ngu" ? f : "vui"))(faceOf(null, pet.face, pet.hour)), // ảnh khoe không để Pi ngủ
    tf: Object.fromEntries(Object.values(pet.equipped || {}).map((id) => [id, PI_ITEM[id]?.tf]).filter(([, t]) => t)),
    man: PI_MANIFEST, base: PI_BASE, ver: PI_VER, logo: "/logo.png",
    room: roomFile(sceneOf(today), piRoomTime(pet.hour ?? 12)), evRoom: frame?.ev ? roomFile(frame.ev, "toi") : null,
    stats: { ...weekStats(pet.keys, pet.day || today), owned: (pet.owned || []).length }, journey: pet.journey ?? null,
    trophy: [...(pet.achievements || [])].filter((a) => a.done).pop()?.item?.name || null,
    code: share?.code || "", nick: share?.nick || "pi",
  };
  const draw = (fr, o) => drawKhoe({ ...base, frame: fr, showStats: o.stats, showJourney: o.weight, showCode: o.code && !!share?.code });

  useEffect(() => {
    if (!share) return;
    let alive = true, u = null;
    draw(frame, opt).then((cv) => toBlob(cv)).then((b) => { if (!alive || !b) return; blobRef.current = b; u = URL.createObjectURL(b); setUrl(u); });
    return () => { alive = false; if (u) URL.revokeObjectURL(u); };
  }, [share, sel, opt.stats, opt.weight, opt.code]); // eslint-disable-line react-hooks/exhaustive-deps

  // bật trang web + ảnh xem trước (khung Phòng của Pi, 720×1280 JPEG) — lỗi ở bước này không chặn Lưu / Chia sẻ
  const publish = async () => {
    try {
      const cv = await draw(frames[0], { stats: true, weight: false, code: true });
      const small = document.createElement("canvas"); small.width = 720; small.height = 1280;
      small.getContext("2d").drawImage(cv, 0, 0, 720, 1280);
      const jpg = await toBlob(small, "image/jpeg", 0.82);
      const path = `${userId}/khoe.jpg`;
      const up = await supabase.storage.from("pi-share").upload(path, jpg, { contentType: "image/jpeg", upsert: true, cacheControl: "300" });
      const { data } = await supabase.rpc("pi_share_set", { p_web_on: share?.web_on ? null : true, p_show_weight: null, p_og: up.error ? null : path });
      if (data) setShare(data);
    } catch (e) { /* mạng chập chờn: lần sau thử lại */ }
  };
  const fileName = `pi-${share?.nick || "fipilot"}.png`;
  const save = async () => {
    if (!url || busy) return;
    setBusy("save");
    const a = document.createElement("a"); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
    track("khoe_share", { how: "save", frame: sel });
    showToast?.({ text: "Đã lưu ảnh" }, 2500);
    await publish();
    setBusy("");
  };
  const doShare = async () => {
    if (!blobRef.current || busy) return;
    setBusy("share");
    await publish();
    const f = new File([blobRef.current], fileName, { type: "image/png" });
    const text = opt.code && share?.code ? `Nuôi Pi cùng mình nha! Nhập mã ${share.code} là cả hai được 50 Hạt: ${piPageUrl(share.nick)}` : `Pi của mình nè: ${piPageUrl(share?.nick || "")}`;
    try {
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text }); track("khoe_share", { how: "share", frame: sel }); }
      else if (navigator.share) { await navigator.share({ text, url: piPageUrl(share?.nick || "") }); track("khoe_share", { how: "link", frame: sel }); }
      else { setBusy(""); await save(); return; }
    } catch (e) { /* khách huỷ */ }
    setBusy("");
  };
  const toggleWeb = async () => {
    if (!share || busy) return;
    setBusy("web");
    const { data, error } = await supabase.rpc("pi_share_set", { p_web_on: !share.web_on, p_show_weight: null, p_og: null });
    if (error) showToast?.({ text: "Chưa đổi được, thử lại." }); else setShare(data);
    setBusy("");
  };

  return (
    <div className="fpm" onClick={sw.close} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,0.45)", fontFamily: FONT, color: "#0F172A", animation: "fpmFade .15s ease" }}>
      <div ref={sw.ref} {...sw.swipe} data-testid="khoe-sheet" role="dialog" aria-modal="true" aria-label="Khoe Pi" onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: "calc(env(safe-area-inset-top, 0px) + 24px)", maxWidth: 560, margin: "0 auto", overflowY: "auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 18px) 16px", display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box", animation: "fpmSheetUp .2s ease" }}>
        <SheetHandle />
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ flex: 1, fontSize: 20, fontWeight: 900 }}>Khoe Pi</span>
          <button onClick={sw.close} aria-label="Đóng" style={{ width: 34, height: 34, borderRadius: 17, border: "none", background: "#F1F5F9", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>{Icon.close(16)}</button>
        </div>
        {/* ảnh xem trước: cao tối đa ~2/3 màn, giữ tỉ lệ 9:16 */}
        <div data-testid="khoe-preview" data-ready={url ? "1" : undefined} style={{ alignSelf: "center", height: "min(568px, calc(100dvh - 300px))", aspectRatio: "9 / 16", maxWidth: "100%", borderRadius: 16, overflow: "hidden", background: "#E0EBFF", boxShadow: "0 10px 24px rgba(15,23,42,0.18)", flexShrink: 0 }}>
          {url ? <img src={url} alt="Ảnh khoe Pi" style={{ display: "block", width: "100%", height: "100%" }} />
            : <span style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#64748B" }}>{err || "Đang vẽ ảnh…"}</span>}
        </div>
        {frames.length > 1 && (
          <div role="tablist" aria-label="Khung ảnh" style={{ display: "grid", gridTemplateColumns: `repeat(${frames.length}, minmax(0, 1fr))`, background: "#EEF2F7", borderRadius: 12, padding: 3, gap: 3, flexShrink: 0 }}>
            {frames.map((f) => (
              <button key={f.id} role="tab" aria-selected={f.id === sel} data-testid={`khoe-frame-${f.id}`} onClick={() => setSel(f.id)}
                style={{ height: 34, borderRadius: 9, border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 800, background: f.id === sel ? "#FFFFFF" : "transparent", color: f.id === sel ? "#0F172A" : "#475569", boxShadow: f.id === sel ? "0 1px 3px rgba(15,23,42,0.12)" : "none" }}>{f.label}</button>
            ))}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, flexShrink: 0 }}>
          <Opt testid="khoe-opt-stats" on={opt.stats} onClick={() => setOpt((o) => ({ ...o, stats: !o.stats }))}>Số liệu tuần</Opt>
          <Opt testid="khoe-opt-weight" on={opt.weight && pet.journey != null} disabled={pet.journey == null} onClick={() => setOpt((o) => ({ ...o, weight: !o.weight, stats: true }))}>Tiến độ cân</Opt>
          <Opt testid="khoe-opt-code" on={opt.code} onClick={() => setOpt((o) => ({ ...o, code: !o.code }))}>Mã mời</Opt>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10, marginTop: "auto", flexShrink: 0 }}>
          <button data-testid="khoe-save" onClick={save} disabled={!url || !!busy} style={{ height: 50, borderRadius: 16, border: "none", background: "#EEF4FF", color: "#0062F0", fontFamily: "inherit", fontSize: 16, fontWeight: 900 }}>{busy === "save" ? "Đang lưu…" : "Lưu ảnh"}</button>
          <button data-testid="khoe-share" onClick={doShare} disabled={!url || !!busy} style={{ height: 50, borderRadius: 16, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontFamily: "inherit", fontSize: 16, fontWeight: 900 }}>{busy === "share" ? "Đang mở…" : "Chia sẻ"}</button>
        </div>
        {share && (
          <div data-testid="khoe-web" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748B", fontWeight: 600, flexShrink: 0 }}>
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {share.web_on ? <>Trang Pi đang mở: <b style={{ color: "#0F172A" }}>fipilotai.com/pi/{share.nick}</b></> : "Lưu hoặc chia sẻ là mở trang Pi trên web để bạn bè quét mã xem"}
            </span>
            {share.web_on && <button data-testid="khoe-web-off" onClick={toggleWeb} disabled={!!busy} style={{ border: "none", background: "none", color: "#0062F0", fontFamily: "inherit", fontSize: 12, fontWeight: 800, padding: 4 }}>Ẩn trang</button>}
          </div>
        )}
      </div>
    </div>
  );
}
