// 31/10 (bản vẽ "Giỏ món theo đơn vị", chủ dự án chốt): ô khẩu phần trong giỏ Ghi bữa + sheet chọn khẩu phần.
//  - PortionStepper: − [2 quả ▾] + ; món chưa có đơn vị: − [150 g] + (gõ gram tại chỗ). Giữ ngón trên −/+ → tăng giảm liên tục (0,4 s rồi mỗi 0,15 s).
//  - PortionSheet: hàng 52 mỗi cỡ (gram + kcal), chạm = chọn + đóng; dòng "Nhập gram" bật bàn phím số, Xong / chạm ngoài là lưu; vuốt xuống / chạm nền là đóng.
// Thông số theo bản vẽ: nút 40×40 bo 12 nền #EEF4FF chữ #0062F0 20/800; ô khẩu phần 112×40 bo 12 nền #F1F5F9 chữ 14/800 + mũi tên 14 #0062F0.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SR } from "./ui";
import { fmtInt } from "../lib/mobileView";
import { optionsFor, readPortion, stepPortion, pickPortion, gramPortion, fmtQty } from "../lib/trayPortion";
import { sfx } from "../lib/sfx";

export const STEP_BTN = { width: 40, height: 40, borderRadius: 12, border: "none", background: "#EEF4FF", color: "#0062F0", fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0, fontFamily: "inherit", touchAction: "manipulation", userSelect: "none", WebkitUserSelect: "none", cursor: "pointer" };
const CHIP = { width: 112, height: 40, borderRadius: 12, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0, boxSizing: "border-box", overflow: "hidden" };
const caret = <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0062F0" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m6 9 6 6 6-6" /></svg>;

// nút −/+ có giữ để lặp: chạm 1 lần = 1 bước; giữ > 0,4 s thì mỗi 0,15 s thêm 1 bước (thả ra là dừng, không tính thêm cú chạm)
function HoldBtn({ onStep, label, children }) {
  const t = useRef(null), iv = useRef(null), held = useRef(false);
  const stop = () => { clearTimeout(t.current); clearInterval(iv.current); };
  useEffect(() => stop, []);
  return (
    <button type="button" aria-label={label} style={STEP_BTN}
      onPointerDown={() => { held.current = false; stop(); t.current = setTimeout(() => { held.current = true; onStep(); iv.current = setInterval(onStep, 150); }, 400); }}
      onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={(e) => e.preventDefault()}
      onClick={() => { if (held.current) { held.current = false; return; } onStep(); }}>{children}</button>
  );
}

/** − [khẩu phần] + của 1 món trong giỏ. onChange(fn) nhận hàm (món cũ → món mới) để bấm giữ không bị dùng số cũ */
export function PortionStepper({ item, name, onChange }) {
  const [open, setOpen] = useState(false);
  const opts = optionsFor(item);
  const p = readPortion(item, opts);
  const nm = String(name || "").toLowerCase();
  const step = (dir) => { sfx("pop"); onChange((x) => stepPortion(x, dir)); };
  return (
    <>
      <HoldBtn onStep={() => step(-1)} label={`Bớt ${nm}`}>−</HoldBtn>
      {opts.length ? (
        <button type="button" data-testid="log-portion" data-portion={p ? `${fmtQty(p.n)} ${p.u}` : `${Math.round(item.gram)} g`} onClick={() => setOpen(true)} aria-label={`Khẩu phần ${nm}: ${p ? `${fmtQty(p.n)} ${p.u}` : `${Math.round(item.gram)} gram`}. Chạm để đổi`}
          style={{ ...CHIP, border: "none", padding: "0 8px 0 10px", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "#0F172A", cursor: "pointer", touchAction: "manipulation" }}>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p ? `${fmtQty(p.n)} ${p.u}` : <>{Math.round(item.gram)} <span style={{ fontSize: 12, color: "#0062F0" }}>g</span></>}</span>{caret}
        </button>
      ) : (
        <label style={{ ...CHIP, gap: 2 }}>
          <span style={SR}>Gram {nm}</span>
          <input type="number" inputMode="numeric" value={Math.round(item.gram) || ""} onFocus={(e) => e.target.select()} onChange={(e) => { const v = e.target.value; onChange((x) => gramPortion(x, v)); }}
            style={{ width: 52, border: "none", background: "transparent", textAlign: "right", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#0F172A", outline: "none", padding: 0 }} />
          <span style={{ fontSize: 12, color: "#0062F0" }}>g</span>
        </label>
      )}
      <HoldBtn onStep={() => step(1)} label={`Thêm phần ${nm}`}>+</HoldBtn>
      {open && <PortionSheet item={item} name={name} opts={opts} onClose={() => setOpen(false)} onPick={(fn) => onChange(fn)} />}
    </>
  );
}

// kcal của 1 cỡ (theo kcal / gram hiện tại của món)
const kcalAt = (item, g) => (Number(item.gram) > 0 ? Math.round((Number(item.cal) || 0) * (g / Number(item.gram))) : 0);

export function PortionSheet({ item, name, opts, onClose, onPick }) {
  const p = readPortion(item, opts);
  const per100 = kcalAt(item, 100);
  const [gram, setGram] = useState(String(Math.round(item.gram) || ""));
  const [gFocus, setGFocus] = useState(false);
  const [shown, setShown] = useState(false);
  const [kb, setKb] = useState(0); // độ cao bàn phím (iPhone): đẩy sheet lên trên bàn phím
  const startY = useRef(null), [dy, setDy] = useState(0);
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r); }, []);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const f = () => setKb(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", f); vv.addEventListener("scroll", f); f();
    return () => { vv.removeEventListener("resize", f); vv.removeEventListener("scroll", f); };
  }, []);
  useEffect(() => { const k = (e) => e.key === "Escape" && onClose(); document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [onClose]);
  const choose = (o) => { sfx("pop"); onPick((x) => pickPortion(x, o)); onClose(); };
  const saveGram = () => { const g = Number(gram); if (g > 0 && g !== Math.round(item.gram)) onPick((x) => gramPortion(x, g)); };
  const done = () => { saveGram(); onClose(); };
  const n = p ? p.n : 1;
  const row = { height: 52, borderRadius: 14, background: "#F1F5F9", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", fontSize: 15, fontWeight: 700, border: "2px solid transparent", boxSizing: "border-box", width: "100%", fontFamily: "inherit", color: "#0F172A", textAlign: "left", cursor: "pointer", touchAction: "manipulation" };
  return createPortal(
    <div data-testid="portion-sheet" role="dialog" aria-modal="true" aria-label={`Chọn khẩu phần ${name}`} onClick={(e) => { if (e.target === e.currentTarget) { if (gFocus) saveGram(); onClose(); } }}
      style={{ position: "fixed", inset: 0, zIndex: 400, background: shown ? "rgba(15,23,42,0.45)" : "rgba(15,23,42,0)", transition: "background .25s", display: "flex", alignItems: "flex-end" }}>
      <div onTouchStart={(e) => { startY.current = e.touches[0].clientY; }} onTouchMove={(e) => { if (startY.current != null && !gFocus) setDy(Math.max(0, e.touches[0].clientY - startY.current)); }}
        onTouchEnd={() => { if (dy > 90) onClose(); setDy(0); startY.current = null; }}
        className="portion-sheet"
        style={{ width: "100%", maxWidth: 560, margin: "0 auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: `8px 16px calc(16px + env(safe-area-inset-bottom, 0px)) 16px`, marginBottom: kb, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 6, transform: shown ? `translateY(${dy}px)` : "translateY(100%)", transition: dy ? "none" : "transform .25s cubic-bezier(.2,.8,.2,1)" }}>
        <span aria-hidden="true" style={{ display: "block", width: 40, height: 5, borderRadius: 3, background: "#CBD5E1", margin: "0 auto 6px auto" }} />
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 17, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
          {per100 > 0 && <span style={{ fontSize: 12.5, color: "#64748B", whiteSpace: "nowrap" }}>{fmtInt(per100)} kcal / 100 g</span>}
        </div>
        {opts.map((o) => {
          const on = p && p.u === o.u;
          const g = Math.round(n * o.g);
          return (
            <button key={o.u} type="button" data-testid="portion-opt" aria-pressed={!!on} onClick={() => choose(o)} style={{ ...row, ...(on ? { borderColor: "#007AFF", background: "#EAF1FF" } : {}) }}>
              <span style={{ flex: 1, minWidth: 0 }}>{n !== 1 ? `${fmtQty(n)} ${o.u}` : o.u.charAt(0).toUpperCase() + o.u.slice(1)} <small style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>· {fmtInt(g)} g</small></span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#0062F0", minWidth: 62, textAlign: "right" }}>{fmtInt(kcalAt(item, g))} kcal</span>
            </button>
          );
        })}
        <label style={{ ...row, background: "#FFFFFF", border: !p ? "2px solid #007AFF" : "1.5px solid #DCE3EE", cursor: "text" }}>
          <span style={{ flex: 1 }}>Nhập gram</span>
          <span style={{ width: 78, height: 36, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <span style={SR}>Gram {String(name || "").toLowerCase()}</span>
            <input data-testid="portion-gram" type="number" inputMode="numeric" enterKeyHint="done" value={gram} onFocus={(e) => { setGFocus(true); e.target.select(); }} onBlur={() => { setGFocus(false); saveGram(); }}
              onChange={(e) => setGram(e.target.value.slice(0, 4))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); done(); } }}
              style={{ width: 44, border: "none", background: "transparent", textAlign: "right", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#0F172A", outline: "none", padding: 0 }} />
            <span style={{ fontSize: 12, color: "#0062F0" }}>g</span>
          </span>
        </label>
        {gFocus && <button type="button" data-testid="portion-done" onMouseDown={(e) => e.preventDefault()} onClick={done} style={{ marginTop: 6, height: 48, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#1A7CFF,#0062F0,#0050E6)", color: "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>Xong</button>}
        <style>{"@media (prefers-reduced-motion: reduce){.portion-sheet{transition:none!important}}"}</style>
      </div>
    </div>,
    document.body,
  );
}
